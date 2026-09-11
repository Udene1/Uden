use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::Mutex,
    time::{Duration, Instant},
};

#[derive(Default)]
struct WorkspaceState {
    roots: Mutex<HashSet<PathBuf>>,
}

#[derive(Debug, Deserialize)]
struct CommandRequest {
    workspace_root: String,
    cwd: String,
    program: String,
    #[serde(default)]
    args: Vec<String>,
    #[serde(default = "default_timeout")]
    timeout_ms: u64,
    #[serde(default)]
    approved: bool,
}

fn default_timeout() -> u64 { 120_000 }

#[derive(Debug, Serialize)]
struct CommandResult {
    status: i32,
    success: bool,
    stdout: String,
    stderr: String,
    timed_out: bool,
}

fn canonical_existing(path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(path);
    std::fs::canonicalize(&path).map_err(|e| format!("cannot resolve path {}: {}", path.display(), e))
}

fn is_within(root: &Path, path: &Path) -> bool {
    path == root || path.starts_with(root)
}

fn basename(program: &str) -> String {
    Path::new(program)
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or(program)
        .to_ascii_lowercase()
}

fn requires_approval(program: &str, args: &[String]) -> bool {
    let name = basename(program);
    let joined = args.join(" ").to_ascii_lowercase();

    matches!(name.as_str(),
        "bash" | "sh" | "zsh" | "fish" | "powershell" | "pwsh" | "cmd" | "cmd.exe" |
        "sudo" | "su" | "rm" | "rmdir" | "del" | "format" | "diskpart" |
        "chmod" | "chown" | "kill" | "pkill" | "shutdown" | "reboot"
    ) || joined.contains("git push --force")
      || joined.contains("git push -f")
      || joined.contains("git reset --hard")
      || joined.contains("rm -rf")
}

#[tauri::command]
fn register_workspace(path: String, state: tauri::State<'_, WorkspaceState>) -> Result<String, String> {
    let root = canonical_existing(&path)?;
    if !root.is_dir() {
        return Err(format!("workspace root is not a directory: {}", root.display()));
    }
    state.roots.lock().map_err(|_| "workspace state lock poisoned".to_string())?.insert(root.clone());
    Ok(root.to_string_lossy().into_owned())
}

#[tauri::command]
fn list_workspaces(state: tauri::State<'_, WorkspaceState>) -> Result<Vec<String>, String> {
    let roots = state.roots.lock().map_err(|_| "workspace state lock poisoned".to_string())?;
    Ok(roots.iter().map(|p| p.to_string_lossy().into_owned()).collect())
}

#[tauri::command]
fn workspace_command(request: CommandRequest, state: tauri::State<'_, WorkspaceState>) -> Result<CommandResult, String> {
    if request.program.trim().is_empty() {
        return Err("program is required".into());
    }
    if request.timeout_ms == 0 || request.timeout_ms > 15 * 60 * 1000 {
        return Err("timeout_ms must be between 1ms and 15 minutes".into());
    }

    let root = canonical_existing(&request.workspace_root)?;
    let cwd = canonical_existing(&request.cwd)?;
    let registered = state.roots.lock().map_err(|_| "workspace state lock poisoned".to_string())?.contains(&root);
    if !registered {
        return Err("workspace is not registered on this desktop".into());
    }
    if !is_within(&root, &cwd) {
        return Err(format!("cwd {} is outside workspace {}", cwd.display(), root.display()));
    }

    if requires_approval(&request.program, &request.args) && !request.approved {
        return Err("command requires explicit local approval".into());
    }

    // Commands are executed without a shell by default. This deliberately avoids
    // turning model text into shell source. Shell interpreters remain possible only
    // as explicit programs and therefore pass through the approval gate above.
    let mut child = Command::new(&request.program)
        .args(&request.args)
        .current_dir(&cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to start {}: {}", request.program, e))?;

    let deadline = Instant::now() + Duration::from_millis(request.timeout_ms);
    let mut timed_out = false;
    loop {
        if child.try_wait().map_err(|e| format!("failed waiting for command: {}", e))?.is_some() {
            break;
        }
        if Instant::now() >= deadline {
            timed_out = true;
            let _ = child.kill();
            break;
        }
        std::thread::sleep(Duration::from_millis(25));
    }

    let output = child.wait_with_output().map_err(|e| format!("failed collecting command output: {}", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout).chars().take(200_000).collect();
    let stderr = String::from_utf8_lossy(&output.stderr).chars().take(200_000).collect();
    let status = output.status.code().unwrap_or(if timed_out { 124 } else { 1 });

    Ok(CommandResult { status, success: output.status.success() && !timed_out, stdout, stderr, timed_out })
}

fn main() {
    tauri::Builder::default()
        .manage(WorkspaceState::default())
        .invoke_handler(tauri::generate_handler![register_workspace, list_workspaces, workspace_command])
        .run(tauri::generate_context!())
        .expect("error while running Uden desktop");
}

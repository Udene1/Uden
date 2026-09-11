use serde::{Deserialize, Serialize};
use std::{collections::HashSet, path::{Path, PathBuf}, process::{Command, Stdio}, sync::Mutex, time::{Duration, Instant}};

#[derive(Default)]
struct WorkspaceState { roots: Mutex<HashSet<PathBuf>> }

#[derive(Debug, Deserialize)]
struct CommandRequest {
    workspace_root: String,
    cwd: String,
    program: String,
    #[serde(default)] args: Vec<String>,
    #[serde(default = "default_timeout")] timeout_ms: u64,
    #[serde(default)] approved: bool,
}

#[derive(Debug, Deserialize)]
struct CloneRequest {
    workspace_root: String,
    cwd: String,
    url: String,
    destination: String,
    branch: Option<String>,
    #[serde(default)] depth: Option<u32>,
    #[serde(default = "default_timeout")] timeout_ms: u64,
}

fn default_timeout() -> u64 { 120_000 }

#[derive(Debug, Serialize)]
struct CommandResult { status: i32, success: bool, stdout: String, stderr: String, timed_out: bool }

fn canonical_existing(path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(path);
    std::fs::canonicalize(&path).map_err(|e| format!("cannot resolve path {}: {}", path.display(), e))
}
fn is_within(root: &Path, path: &Path) -> bool { path == root || path.starts_with(root) }
fn basename(program: &str) -> String { Path::new(program).file_name().and_then(|v| v.to_str()).unwrap_or(program).to_ascii_lowercase() }

fn requires_approval(program: &str, args: &[String]) -> bool {
    let name = basename(program);
    let joined = args.join(" ").to_ascii_lowercase();
    matches!(name.as_str(), "bash" | "sh" | "zsh" | "fish" | "powershell" | "pwsh" | "cmd" | "cmd.exe" | "sudo" | "su" | "rm" | "rmdir" | "del" | "format" | "diskpart" | "chmod" | "chown" | "kill" | "pkill" | "shutdown" | "reboot")
        || joined.contains("git push --force") || joined.contains("git push -f") || joined.contains("git reset --hard") || joined.contains("rm -rf")
}

fn validate_workspace(state: &tauri::State<'_, WorkspaceState>, root_text: &str, cwd_text: &str) -> Result<(PathBuf, PathBuf), String> {
    let root = canonical_existing(root_text)?;
    let cwd = canonical_existing(cwd_text)?;
    let registered = state.roots.lock().map_err(|_| "workspace state lock poisoned".to_string())?.contains(&root);
    if !registered { return Err("workspace is not registered on this desktop".into()); }
    if !is_within(&root, &cwd) { return Err(format!("cwd {} is outside workspace {}", cwd.display(), root.display())); }
    Ok((root, cwd))
}

fn collect_output(mut child: std::process::Child, timeout_ms: u64) -> Result<CommandResult, String> {
    let deadline = Instant::now() + Duration::from_millis(timeout_ms);
    let mut timed_out = false;
    loop {
        if child.try_wait().map_err(|e| format!("failed waiting for command: {}", e))?.is_some() { break; }
        if Instant::now() >= deadline { timed_out = true; let _ = child.kill(); break; }
        std::thread::sleep(Duration::from_millis(25));
    }
    let output = child.wait_with_output().map_err(|e| format!("failed collecting command output: {}", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout).chars().take(200_000).collect();
    let stderr = String::from_utf8_lossy(&output.stderr).chars().take(200_000).collect();
    let status = output.status.code().unwrap_or(if timed_out { 124 } else { 1 });
    Ok(CommandResult { status, success: output.status.success() && !timed_out, stdout, stderr, timed_out })
}

#[tauri::command]
fn register_workspace(path: String, state: tauri::State<'_, WorkspaceState>) -> Result<String, String> {
    let root = canonical_existing(&path)?;
    if !root.is_dir() { return Err(format!("workspace root is not a directory: {}", root.display())); }
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
    if request.program.trim().is_empty() { return Err("program is required".into()); }
    if request.timeout_ms == 0 || request.timeout_ms > 15 * 60 * 1000 { return Err("timeout_ms must be between 1ms and 15 minutes".into()); }
    let (_root, cwd) = validate_workspace(&state, &request.workspace_root, &request.cwd)?;
    if requires_approval(&request.program, &request.args) && !request.approved { return Err("command requires explicit local approval".into()); }
    let child = Command::new(&request.program).args(&request.args).current_dir(&cwd).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e| format!("failed to start {}: {}", request.program, e))?;
    collect_output(child, request.timeout_ms)
}

#[tauri::command]
fn clone_repository(request: CloneRequest, state: tauri::State<'_, WorkspaceState>) -> Result<CommandResult, String> {
    if request.url.trim().is_empty() { return Err("repository URL is required".into()); }
    if request.destination.trim().is_empty() { return Err("destination is required".into()); }
    if request.timeout_ms == 0 || request.timeout_ms > 30 * 60 * 1000 { return Err("timeout_ms must be between 1ms and 30 minutes".into()); }
    let (root, cwd) = validate_workspace(&state, &request.workspace_root, &request.cwd)?;
    let target = cwd.join(&request.destination);
    let parent = target.parent().ok_or_else(|| "invalid clone destination".to_string())?;
    let parent = std::fs::canonicalize(parent).map_err(|e| format!("cannot resolve clone destination parent: {}", e))?;
    if !is_within(&root, &parent) { return Err("clone destination is outside the registered workspace".into()); }
    if target.exists() { return Err(format!("clone destination already exists: {}", target.display())); }
    let mut args = vec!["clone".to_string()];
    if let Some(branch) = request.branch.filter(|v| !v.trim().is_empty()) { args.extend(["--branch".into(), branch]); }
    if let Some(depth) = request.depth.filter(|v| *v > 0) { args.extend(["--depth".into(), depth.to_string()]); }
    args.extend(["--".into(), request.url, request.destination]);
    let child = Command::new("git").args(&args).current_dir(&cwd).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e| format!("failed to start git clone: {}", e))?;
    collect_output(child, request.timeout_ms)
}

fn main() {
    tauri::Builder::default().manage(WorkspaceState::default()).invoke_handler(tauri::generate_handler![register_workspace, list_workspaces, workspace_command, clone_repository]).run(tauri::generate_context!()).expect("error while running Uden desktop");
}

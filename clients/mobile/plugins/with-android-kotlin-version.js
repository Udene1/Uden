const { withProjectBuildGradle } = require('@expo/config-plugins');

const KOTLIN_VERSION = '1.9.25';

function pinKotlinVersion(contents) {
  let updated = contents;

  updated = updated.replace(
    /kotlinVersion\s*=\s*findProperty\(['"]android\.kotlinVersion['"]\)\s*\?:\s*['"][^'"]+['"]/,
    `kotlinVersion = findProperty('android.kotlinVersion') ?: '${KOTLIN_VERSION}'`,
  );

  updated = updated.replace(
    /kotlinVersion\s*=\s*['"][^'"]+['"]/,
    `kotlinVersion = '${KOTLIN_VERSION}'`,
  );

  updated = updated.replace(
    /classpath\s*\(\s*['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::[^'"]+)?['"]\s*\)/,
    `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}')`,
  );

  if (!updated.includes(`org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN_VERSION}`)) {
    throw new Error(
      `Unable to pin the Kotlin Gradle plugin to ${KOTLIN_VERSION}; generated android/build.gradle has an unexpected structure.`,
    );
  }

  return updated;
}

module.exports = function withAndroidKotlinVersion(config) {
  return withProjectBuildGradle(config, (projectConfig) => {
    if (projectConfig.modResults.language !== 'groovy') {
      throw new Error('Uden Android Kotlin pin expects the generated project build.gradle to use Groovy.');
    }

    projectConfig.modResults.contents = pinKotlinVersion(projectConfig.modResults.contents);
    return projectConfig;
  });
};

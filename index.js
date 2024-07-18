#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk'; // For colored output
import ora from 'ora'; // For spinner during long operations
import latestVersion from 'latest-version'; // For checking the latest version
import { fileURLToPath } from 'url';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
const currentVersion = packageJson.version;

// Check for updates
const checkForUpdates = async () => {
  try {
    const latest = await latestVersion(packageJson.name);
    if (latest !== currentVersion) {
      console.log(chalk.yellow(`A new version (${latest}) is available. Please update using 'npm update -g ${packageJson.name}'`));
    }
  } catch (error) {
    console.error(chalk.red('Failed to check for updates:', error));
  }
};

const execPromise = (command, cwd) => {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing command: ${stderr}`);
      } else {
        resolve(stdout);
      }
    });
  });
};

const createProjectStructure = async (projectName, gitInit, installDeps, templateType) => {
  const projectPath = path.resolve(process.cwd(), projectName);
  const spinner = ora('Creating project structure...').start();

  try {
    // Validate project name
    if (!projectName || projectName.trim() === '') {
      throw new Error('Project name cannot be empty.');
    }

    if (fs.existsSync(projectPath)) {
      throw new Error(`Directory ${projectPath} already exists.`);
    }

    fs.mkdirSync(projectPath, { recursive: true });

    await execPromise('npm init -y', projectPath);

    if (gitInit) {
      try {
        await execPromise('git init', projectPath);
        console.log(chalk.green('Git repository initialized.'));
      } catch {
        console.log(chalk.yellow('Git is not installed or initialization failed.'));
      }
    }

    const srcPath = path.join(projectPath, 'src');
    const utilsPath = path.join(srcPath, 'utils');

    fs.mkdirSync(srcPath, { recursive: true });
    fs.mkdirSync(utilsPath, { recursive: true });

    const isTypeScript = templateType === 'Blank (TS)';

    // Create empty files based on template
    if (isTypeScript) {
      fs.writeFileSync(path.join(srcPath, 'index.ts'), '');
      fs.writeFileSync(path.join(utilsPath, 'greet.ts'), '');
      fs.writeFileSync(path.join(utilsPath, 'math.ts'), '');
      fs.writeFileSync(path.join(projectPath, 'README.md'), `# ${projectName}\n\nYour project description here.`);
    } else {
      fs.writeFileSync(path.join(srcPath, 'index.js'), '');
      fs.writeFileSync(path.join(utilsPath, 'greet.js'), '');
      fs.writeFileSync(path.join(utilsPath, 'math.js'), '');
      fs.writeFileSync(path.join(projectPath, 'README.md'), `# ${projectName}\n\nYour project description here.`);
    }

    console.log(chalk.green(`Project ${projectName} has been created successfully!`));

    if (installDeps) {
      spinner.start('Installing dependencies...');
      await execPromise('npm install', projectPath);
      spinner.succeed('Dependencies installed.');
    } else {
      spinner.succeed();
    }
  } catch (error) {
    spinner.fail();
    console.error(chalk.red('Error creating project:'), error);
  }
};

const main = async () => {
  try {
    await checkForUpdates(); // Check for updates

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: 'Which template do you want?',
        choices: ['Blank (JavaScript)', 'Blank (TypeScript)', 'Blank (JS)', 'Blank (TS)'],
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'What is the project name?',
        validate: input => {
          if (!input || input.trim() === '') {
            return 'Project name cannot be empty.';
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'gitInit',
        message: 'Do you want to initialize a Git repository?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'installDeps',
        message: 'Do you want to install additional dependencies?',
        default: false,
      },
    ]);

    const templateType = answers.template === 'Blank (JavaScript)' || answers.template === 'Blank (JS)' ? 'Blank (JS)' : 'Blank (TS)';
    await createProjectStructure(answers.projectName, answers.gitInit, answers.installDeps, templateType);
  } catch (error) {
    console.error(chalk.red('Error during project setup:'), error);
    process.exit(1);
  }
};

main();

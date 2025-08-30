#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Green Hydrogen Subsidy Development Environment\n');

async function runCommand(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`📁 Running: ${command} ${args.join(' ')} in ${cwd}`);
    
    const child = spawn(command, args, { 
      cwd, 
      stdio: 'inherit',
      shell: true 
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  try {
    await runCommand('node', ['--version']);
    await runCommand('npm', ['--version']);
    console.log('✅ Node.js and npm are installed\n');
  } catch (error) {
    console.error('❌ Node.js or npm not found. Please install Node.js first.');
    process.exit(1);
  }
}

async function setupContracts() {
  console.log('📦 Setting up smart contracts...');
  const contractsDir = path.join(__dirname, '..', 'contracts');
  
  try {
    await runCommand('npm', ['install'], contractsDir);
    console.log('✅ Smart contracts dependencies installed\n');
  } catch (error) {
    console.error('❌ Failed to install smart contract dependencies');
    throw error;
  }
}

async function setupBackend() {
  console.log('🔧 Setting up backend...');
  const backendDir = path.join(__dirname, '..', 'backend');
  
  try {
    await runCommand('npm', ['install'], backendDir);
    
    // Create .env file if it doesn't exist
    const envExample = path.join(backendDir, '.env.example');
    const envFile = path.join(backendDir, '.env');
    
    if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envFile);
      console.log('📝 Created .env file from template');
    }
    
    console.log('✅ Backend dependencies installed\n');
  } catch (error) {
    console.error('❌ Failed to setup backend');
    throw error;
  }
}

async function startLocalBlockchain() {
  console.log('⛓️ Starting local blockchain...');
  const contractsDir = path.join(__dirname, '..', 'contracts');
  
  try {
    console.log('🔄 This will start Hardhat network in the background...');
    console.log('💡 Run "npm run deploy:contracts" in the contracts directory to deploy contracts');
    console.log('💡 Then run "npm run dev" in the backend directory to start the API\n');
  } catch (error) {
    console.error('❌ Failed to start blockchain');
    throw error;
  }
}

async function showNextSteps() {
  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Configure your .env file in the backend directory');
  console.log('2. Start the local blockchain:');
  console.log('   cd contracts && npx hardhat node');
  console.log('3. Deploy smart contracts (in a new terminal):');
  console.log('   cd contracts && npm run deploy:contracts');
  console.log('4. Start the backend API (in a new terminal):');
  console.log('   cd backend && npm run dev');
  console.log('5. Test the API:');
  console.log('   curl http://localhost:5000/health');
  console.log('\n📚 Documentation:');
  console.log('- API Documentation: docs/API_DOCUMENTATION.md');
  console.log('- Deployment Guide: docs/DEPLOYMENT_GUIDE.md');
  console.log('- Architecture Overview: docs/ARCHITECTURE.md');
  console.log('\n🛡️ Security Notes:');
  console.log('- Change default passwords in production');
  console.log('- Configure proper JWT secrets');
  console.log('- Set up SSL/TLS certificates');
  console.log('- Review security settings before deployment');
  console.log('\n✨ Happy coding! 🌱💚');
}

async function main() {
  try {
    await checkPrerequisites();
    await setupContracts();
    await setupBackend();
    await startLocalBlockchain();
    await showNextSteps();
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('- Ensure Node.js version 18+ is installed');
    console.log('- Check internet connection for package downloads');
    console.log('- Verify you have write permissions in the directory');
    console.log('- Try running individual setup steps manually');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

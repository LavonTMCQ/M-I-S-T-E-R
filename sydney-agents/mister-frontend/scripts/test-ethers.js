import hre from "hardhat";

console.log("Debug: hre.ethers exists?", !!hre.ethers);
console.log("Debug: hre keys:", Object.keys(hre));

const ethers = hre.ethers;

async function testEthers() {
  console.log("🧪 Testing Ethers.js connection...");
  
  try {
    const [deployer] = await ethers.getSigners();
    console.log("✅ Ethers.js working!");
    console.log("📍 Default account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    
    const network = await ethers.provider.getNetwork();
    console.log("🌐 Network:", network.name, "Chain ID:", network.chainId.toString());
    
    return true;
  } catch (error) {
    console.error("❌ Ethers.js test failed:", error.message);
    return false;
  }
}

testEthers()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
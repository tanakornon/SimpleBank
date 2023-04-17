import { ethers } from "hardhat";

async function main() {
    const STT = await ethers.getContractFactory("STT");
    const token = await STT.deploy();
    await token.deployed();

    console.log("STT deployed to Address:", token.address);

    const SimpleBank = await ethers.getContractFactory("SimpleBank");
    const bank = await SimpleBank.deploy(token.address);
    await bank.deployed();

    console.log("SimpleBank deployed to Address:", bank.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });

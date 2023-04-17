import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
    solidity: "0.8.17",
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {},
        sepolia: {
            url: "https://eth-sepolia.g.alchemy.com/v2/xZeB-7P3kY7MVwecMIYc8KBsceKrd5to",
            accounts: [
                "0xb587b4fa230dd6362a9cbffc15fef50395bdb8fdc99f6f84b7392cc252a3553c",
            ],
        },
    },
};

export default config;

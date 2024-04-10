// imports
const { getNamedAccounts, ethers } = require("hardhat")

// 04-deploy-sender 脚本中的 contract number
const sourceChainSenderAddress = "0x26bB91c400c797192B430f6FA68504bc92dd0B35"   //

// CCIP-BnM sepolia-> mumbai: 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05
// CCIP-BnM MumBai-> Fuji: 0xf1E3A5842EeEF51F2967b3F05D45DD4f4205FF40
// CCIP-BnM MumBai-> Sepolia: 0xf1E3A5842EeEF51F2967b3F05D45DD4f4205FF40
// CCIP-BnM fuji -> sepolia : 0xD21341536c5cF5EB1bcb58f6723cE26e8D8E90e4
// CCIP-BnM sepolia -> fuji : 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05
const CCIPBnMContractAddress = "0xf1E3A5842EeEF51F2967b3F05D45DD4f4205FF40" // 当前网络的 token
const FUND_AMOUNT = ethers.utils.parseUnits("1", 6)

//Sepolia -> Fuji :  14767482510784806043
// Fuji -> Sepolia: 16015286601757825753
// Mumbai -> fuji： 14767482510784806043
const destinationChainSelector = "14767482510784806043"
const receiver = "0xD0aE369f3994F453aA0bD738D75fB4F84DFD1d34"
const feeToken = "1"
const to = "0x72f5AA517Eab04E71e51f8dD91Fee77c6f1bB5D6"
const amount = "1000000"

// async main
async function main() {
    const { deployer } = await getNamedAccounts()
    // 获取 sender 合约
    const sourceChainSender = await ethers.getContractAt(
        "SourceChainSender",
        sourceChainSenderAddress,
        deployer
    )
    // 获取 CCIP-BnM 合约
    const CCIPBnMContract = await ethers.getContractAt(
        "ERC20",
        CCIPBnMContractAddress
    )

    // Transfer 1 CCIP-BnM token to the SourceChainSender as cross chain token
    const approveTx = await CCIPBnMContract.approve(
        sourceChainSender.address,
        FUND_AMOUNT
    )
    await approveTx.wait(1)

    console.log("fund 1 CCIP-BnM to SourceChainSender Contract...")
    const fundTx = await sourceChainSender.fund(FUND_AMOUNT, {
        gasLimit: 1000000,
    })
    await fundTx.wait(1)

    console.log("transaction successfully...")

    const balance = await CCIPBnMContract.balanceOf(deployer)
    console.log(
        `Deployer has balance: ${ethers.utils.formatEther(balance)} CCIP-BnM`
    )

    // Call the sendMessage function to cross-chain 1 CCIP-BnM to Sepolia
    console.log("Call sendMessage function...")
    const crossChainTx = await sourceChainSender.sendMessage(
        destinationChainSelector,
        receiver,
        feeToken,
        to,
        amount
    )
    console.log(`Cross-chain transaction hash: ${crossChainTx.hash}`) // copy it to Chainlink CCIP Explorer page, check cross chain status.
    await crossChainTx.wait(1)
    console.log(
        "Cross Chain 1 CCIP-BnM from Avalanche Fuji to Polygon Mumbai is successfully!"
    )
}

// main
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

// imports
const { run, network, getNamedAccounts, ethers } = require("hardhat")

//  MUMBAI Link Token: 0x326C977E6efc84E512bB9C30f76E30c160eD06FB
//  Fuji Link Token: 0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846
//  Sepolia Link token  : 0x779877A7B0D9E8603169DdbD7836e478b4624789
const linkTokenAddress = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB" // MUMBAI link

// Mumbai -> fuji : 0x5e0AD6D742983Ca464Fef0c28fD2D788a320B1c3
// Fuji -> Mumbai: 0xcA2C3196047FE0E31547B7214E5B7c49413fE9a8
// sepolia -> Fuji:  0x0477cA0a35eE05D3f9f424d88bC0977ceCf339D4
// Fuji route: 0xF694E193200268f9a4868e4Aa017A0118C9a8177
// sepolia route: 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59
// Mumbai: 0x1035CabC275068e0F4b745A29CEDf38E13aF41b1
const fujiRouter = "0x1035CabC275068e0F4b745A29CEDf38E13aF41b1"  // 当前网络 route Mumbai router

//
// USDC Token : Mumbai -> fuji : 0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97
// USDC Token : fuji -> Mumbai : 0xcA2C3196047FE0E31547B7214E5B7c49413fE9a8
// USDC Token: Sepolia -> fuji: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
// CCIP-BnM sepolia-> mumbai: 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05
// CCIP-BnM MumBai-> Fuji: 0xf1E3A5842EeEF51F2967b3F05D45DD4f4205FF40
// CCIP-BnM MumBai-> Sepolia: 0xf1E3A5842EeEF51F2967b3F05D45DD4f4205FF40
// CCIP-BnM fuji -> sepolia : 0xD21341536c5cF5EB1bcb58f6723cE26e8D8E90e4
// CCIP-BnM sepolia -> fuji : 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05
const rossChainToken = "0xf1E3A5842EeEF51F2967b3F05D45DD4f4205FF40"  // sepolia CCIP-BnM to mumbai

// You can change to you deployed
const FUND_AMOUNT = ethers.utils.parseEther("0.001")

// async main
async function main() {
    const { deployer } = await getNamedAccounts()
    const linkContract = await ethers.getContractAt("ERC20", linkTokenAddress)
    const SourceChainSenderFactory = await ethers.getContractFactory(
        "SourceChainSender"
    )
    console.log("Deploying contract...")
    const sourceChainSender = await SourceChainSenderFactory.deploy(
        fujiRouter,
        linkTokenAddress,
        rossChainToken
    )
    await sourceChainSender.deployed()
    console.log(`Deployed contract to: ${sourceChainSender.address}`)

    // Transfer 1 LINK token to the SourceChainSender as feeToken
    const approveTx = await linkContract.transfer(
        sourceChainSender.address,
        ethers.utils.parseEther("1")
    )
    await approveTx.wait(1)
    console.log("Transfer 1 LINK token to the SourceChainSender as feeToken done!")

    // Approve 0.001 rossToken to the SourceChainSender
    const rossTokenContract = await ethers.getContractAt("ERC20", rossChainToken)
    const approveTx2 = await rossTokenContract.approve(
        sourceChainSender.address,
        FUND_AMOUNT
    )
    await approveTx2.wait(1)
    console.log("Approve crossToken to the SourceChainSender done!")


    const fundTx = await sourceChainSender.fund(FUND_AMOUNT,{
        gasLimit: 10000000
    })
    await fundTx.wait(1)
    console.log("fund() done!")


    const sourceChainSenderBalance = await linkContract.balanceOf(
        sourceChainSender.address
    )
    console.log(
        `Sender has balance: ${ethers.utils.formatEther(
            sourceChainSenderBalance
        )} LINK`
    )

    // // Verify contract
    if (network.config.chainId === 80001 && process.env.MUMBAI_RPC_URL) {
        console.log("Waiting for block confirmations...")
        await sourceChainSender.deployTransaction.wait(3)
        await verify(sourceChainSender.address, [
            fujiRouter,
            linkTokenAddress,
            rossChainToken,
        ])
    }
}

// Verify
const verify = async (contractAddress, args) => {
    console.log("Verifying contract...")
    try {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already Verified!")
        } else {
            console.log(e)
        }
    }
}

// main
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

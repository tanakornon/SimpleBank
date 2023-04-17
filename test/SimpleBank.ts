import { ethers, network } from "hardhat";
import { expect } from "chai";
import { STT, SimpleBank } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("SimpleBank", () => {
    const MILLION = 1_000_000;
    const BILLION = 1_000_000_000;

    let token: STT;
    let bank: SimpleBank;

    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;

    before(async () => {
        [owner, alice, bob] = await ethers.getSigners();

        const STT = await ethers.getContractFactory("STT", owner);
        token = await STT.deploy();
        await token.deployed();

        await token.transfer(alice.address, BILLION);
        await token.transfer(bob.address, BILLION);
    });

    beforeEach(async () => {
        const SimpleBank = await ethers.getContractFactory("SimpleBank", owner);
        bank = await SimpleBank.deploy(token.address);
        await bank.deployed();

        await token.connect(alice).approve(bank.address, BILLION);
        await token.connect(bob).approve(bank.address, BILLION);
    });

    describe("deposit", () => {
        it("should revert if the deposit amount is invalid", async () => {
            const amount = 0;

            await expect(
                bank.connect(alice).deposit(amount)
            ).to.be.revertedWith("Invalid deposit amount");
        });

        it("should be able to deposit", async () => {
            const amount = MILLION;

            await bank.connect(alice).deposit(amount);

            const expected = MILLION;
            const actual = (await bank.accounts(alice.address)).balance;
            expect(expected).to.equal(actual);
        });

        it("should update totalDeposits", async () => {
            const amount = MILLION;

            await bank.connect(alice).deposit(amount);

            const expected = MILLION;
            const actual = await bank.totalDeposits();
            expect(expected).to.equal(actual);
        });

        it("should update interest if have the deposited balance", async () => {
            const amount = MILLION;
            const interest = 600; // 0.01% of 6 blocks

            await bank.connect(alice).deposit(amount);

            const blocksToWait = 5;
            for (let i = 0; i < blocksToWait; i++) {
                await network.provider.send("evm_mine");
            }

            await bank.connect(alice).deposit(amount);

            const expected = MILLION + interest + MILLION;
            const actual = (await bank.accounts(alice.address)).balance;
            expect(expected).to.equal(actual);
        });
    });

    describe("withdraw", () => {
        it("should revert if the withdrawal amount is invalid", async () => {
            const amount = 0;

            await expect(
                bank.connect(alice).withdraw(amount)
            ).to.be.revertedWith("Invalid withdrawal amount");
        });

        it("should revert if the withdrawal amount exceed reversed amount", async () => {
            const amount = MILLION;

            await bank.connect(alice).deposit(amount);
            await expect(
                bank.connect(alice).withdraw(amount)
            ).to.be.revertedWith("Bank run!!!");
        });

        it("should revert if the not enough balance to withdraw", async () => {
            const amount = MILLION;
            await expect(
                bank.connect(alice).withdraw(amount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("should be able to withdraw", async () => {
            const depositAmount = MILLION;
            const reversedDepositAmount = MILLION * 2;
            const withdrawAmount = 5000;
            const interest = 100; // 0.01% of 1 block

            await bank.connect(bob).deposit(reversedDepositAmount);
            await bank.connect(alice).deposit(depositAmount);
            await bank.connect(alice).withdraw(withdrawAmount);

            const expected = depositAmount - withdrawAmount + interest;
            const actual = (await bank.accounts(alice.address)).balance;
            expect(expected).to.equal(actual);
        });

        it("should be able to withdraw balance with interest", async () => {
            const interest = 100; // 0.01 % of 1 block
            const depositAmount = MILLION;
            const reversedDepositAmount = MILLION * 2;
            const withdrawAmount = MILLION + interest;

            await bank.connect(bob).deposit(reversedDepositAmount);
            await bank.connect(alice).deposit(depositAmount);
            await bank.connect(alice).withdraw(withdrawAmount);

            const expected = 0;
            const actual = (await bank.accounts(alice.address)).balance;
            expect(expected).to.equal(actual);
        });

        it("should update totalDeposits", async () => {
            const depositAmount = MILLION;
            const withdrawAmount = 5000;
            const interest = 100; // 0.01% of 1 block

            await bank.connect(alice).deposit(depositAmount);
            await bank.connect(alice).withdraw(withdrawAmount);

            const expected = depositAmount - withdrawAmount + interest;
            const actual = await bank.totalDeposits();
            expect(expected).to.equal(actual);
        });
    });

    describe("borrow", () => {
        it("should revert if the borrow amount is invalid", async () => {
            const amount = 0;

            await expect(bank.connect(alice).borrow(amount)).to.be.revertedWith(
                "Invalid borrow amount"
            );
        });

        it("should revert if already have loan", async () => {
            const depositAmount = MILLION;
            const borrowAmount = 5000;

            await bank.connect(bob).deposit(depositAmount);
            await bank.connect(alice).borrow(borrowAmount);
            await expect(
                bank.connect(alice).borrow(borrowAmount)
            ).to.be.revertedWith("You already have a loan");
        });

        it("should revert if the borrow amount exceed reversed amount", async () => {
            const depositAmount = MILLION;
            const borrowAmount = MILLION;

            await bank.connect(bob).deposit(depositAmount);
            await expect(
                bank.connect(alice).borrow(borrowAmount)
            ).to.be.revertedWith("Bank run!!!");
        });

        it("should be able to borrow", async () => {
            const depositAmount = MILLION;
            const borrowAmount = 500;

            await bank.connect(bob).deposit(depositAmount);
            await bank.connect(alice).borrow(borrowAmount);

            const expected = borrowAmount;
            const actual = (await bank.accounts(alice.address)).loan;
            expect(expected).to.equal(actual);
        });

        it("should update totalDeposits", async () => {
            const depositAmount = MILLION;
            const borrowAmount = 500;

            await bank.connect(bob).deposit(depositAmount);
            await bank.connect(alice).borrow(borrowAmount);

            const expected = depositAmount - borrowAmount;
            const actual = await bank.totalDeposits();
            expect(expected).to.equal(actual);
        });
    });

    describe("repay", () => {
        it("should revert if the don't have loan", async () => {
            const amount = 0;

            await expect(bank.connect(alice).repay(amount)).to.be.revertedWith(
                "You don't have a loan"
            );
        });

        it("should revert if the repay amount is invalid", async () => {
            const depositAmount = MILLION;
            const borrowAmount = 5000;
            const repayAmount = 0;

            await bank.connect(bob).deposit(depositAmount);
            await bank.connect(alice).borrow(borrowAmount);
            await expect(
                bank.connect(alice).repay(repayAmount)
            ).to.be.revertedWith("Invalid repay amount");
        });

        it("should revert if the repay amount not in range of loan amount", async () => {
            const depositAmount = MILLION;
            const borrowAmount = 5000;
            const repayAmount = MILLION;

            await bank.connect(bob).deposit(depositAmount);
            await bank.connect(alice).borrow(borrowAmount);
            await expect(
                bank.connect(alice).repay(repayAmount)
            ).to.be.revertedWith(
                "Repay amount must lesser than or equal loan amount"
            );
        });

        it("should be able to replay", async () => {
            const depositAmount = MILLION;
            const borrowAmount = 5000;
            const repayAmount = 5000;
            const interest = 5; // 0.1% of 1 block

            await bank.connect(bob).deposit(depositAmount);
            await bank.connect(alice).borrow(borrowAmount);
            await bank.connect(alice).repay(repayAmount);

            const expected = interest;
            const actual = (await bank.accounts(alice.address)).loan;
            expect(expected).to.equal(actual);
        });

        it("should be able to replay loan with interest", async () => {
            const interest = 5; // 0.1% of 1 block
            const depositAmount = MILLION;
            const borrowAmount = 5000;
            const repayAmount = 5000 + interest;

            await bank.connect(bob).deposit(depositAmount);
            await bank.connect(alice).borrow(borrowAmount);
            await bank.connect(alice).repay(repayAmount);

            const expected = 0;
            const actual = (await bank.accounts(alice.address)).loan;
            expect(expected).to.equal(actual);
        });

        it("should update totalDeposits", async () => {
            const depositAmount = MILLION;
            const borrowAmount = 5000;
            const repayAmount = 5000;

            await bank.connect(bob).deposit(depositAmount);
            await bank.connect(alice).borrow(borrowAmount);
            await bank.connect(alice).repay(repayAmount);

            const expected = MILLION - borrowAmount + repayAmount;
            const actual = await bank.totalDeposits();
            expect(expected).to.equal(actual);
        });
    });

    describe("interest", () => {
        it("should calculate balance interest", async () => {
            const amount = MILLION;

            await bank.connect(alice).deposit(amount);

            const blocksToWait = 100;
            for (let i = 0; i < blocksToWait; i++) {
                await network.provider.send("evm_mine");
            }

            const expected = 10000;
            const actual = await bank.calculateBalanceInterest(alice.address);
            expect(expected).to.equal(actual);
        });

        it("should calculate loan interest", async () => {
            const depositAmount = MILLION;
            const borrowAmount = 10000;

            await bank.connect(bob).deposit(depositAmount);
            await bank.connect(alice).borrow(borrowAmount);

            const blocksToWait = 100;
            for (let i = 0; i < blocksToWait; i++) {
                await network.provider.send("evm_mine");
            }

            const expected = 1000;
            const actual = await bank.calculateLoanInterest(alice.address);
            expect(expected).to.equal(actual);
        });

        it("should calculate loan interest base on borrow amount", async () => {
            const depositAmount = MILLION;
            const borrowAmount = 10000;
            const repayAmount = 10000;

            await bank.connect(bob).deposit(depositAmount);
            await bank.connect(alice).borrow(borrowAmount);
            // this block will add loan interest by 0.1% = 10
            // you need to repay total of 10010 to end loan
            await bank.connect(alice).repay(repayAmount);

            const blocksToWait = 100;
            for (let i = 0; i < blocksToWait; i++) {
                await network.provider.send("evm_mine");
            }

            const expected = 1000;
            const actual = await bank.calculateLoanInterest(alice.address);
            expect(expected).to.equal(actual);
        });
    });
});

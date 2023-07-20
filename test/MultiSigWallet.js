const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("MultiSigWallet", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deploy3of5MultiSigWallet() {
    const signers = await ethers.getSigners();
    const owners = [signers[0].address, signers[1].address, signers[2].address, signers[3].address, signers[4].address];
    const receiver = signers[5].address;
    const approvalsRequired = 3;
    const depositAmount = ethers.utils.parseEther("100");
   
    // Contracts are deployed using the first signer/account by default
    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    const wallet = await MultiSigWallet.deploy(owners, approvalsRequired, {value: depositAmount});

    return { wallet, signers, owners, approvalsRequired, depositAmount, receiver };
  }

  async function submitTransaction() {
    const { wallet, signers, owners, receiver } = await loadFixture(deploy3of5MultiSigWallet);

    const amount = ethers.utils.parseEther("1.5");
    const abiCoder = new ethers.utils.AbiCoder;
    const data = abiCoder.encode(["string", "bytes"], ["TwitterContestV1", abiCoder.encode(["bytes"], ["0x"])]);
    await wallet.connect(signers[1]).submitTxn(receiver, data, amount);

    return { wallet, owners, receiver, data, amount };
  }

  describe("Deployment", function () {
    it("Should set the right number of approval required", async function () {
      const { wallet, approvalsRequired } = await loadFixture(deploy3of5MultiSigWallet);

      expect(await wallet.approvalsRequired()).to.equal(approvalsRequired);
    });

    it("Should set the right owners", async function () {
      const { wallet, owners } = await loadFixture(deploy3of5MultiSigWallet);

      expect(await wallet.getOwners()).to.deep.equal(owners);
    });

    it("Should receive and store the funds to lock", async function () {
      const { wallet, depositAmount } = await loadFixture(deploy3of5MultiSigWallet);

      expect(await ethers.provider.getBalance(wallet.address)).to.equal(depositAmount);
    });

    it("Should fail if 0 owners", async function () {
      // We don't use the fixture here because we want a different deployment
      const owners = [];
      const approvalsRequired = 3;
      const depositAmount = ethers.utils.parseEther("100");
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(MultiSigWallet.deploy(owners, approvalsRequired, {value: depositAmount})).to.be.revertedWith(
        "MultiSigWallet must have at least 1 owner"
      );
    });

    it("Should fail if approvals required is greater than number of owners", async function () {
      // We don't use the fixture here because we want a different deployment
      const [owner1, owner2, owner3, owner4, owner5] = await ethers.getSigners(); 
      const owners = [owner1.address, owner2.address, owner3.address, owner4.address, owner5.address];
      const approvalsRequired = 6;
      const depositAmount = ethers.utils.parseEther("100");
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(MultiSigWallet.deploy(owners, approvalsRequired, {value: depositAmount})).to.be.revertedWith(
        "number of approvals must be less or equal to number of owners"
      );
    });

    it("Should fail if one of the owners is address(0)", async function () {
      // We don't use the fixture here because we want a different deployment
      const [owner1, owner2, owner3, owner4, owner5] = await ethers.getSigners(); 
      const owners = [ethers.constants.AddressZero, owner2.address, owner3.address, owner4.address, owner5.address];
      const approvalsRequired = 3;
      const depositAmount = ethers.utils.parseEther("100");
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(MultiSigWallet.deploy(owners, approvalsRequired, {value: depositAmount})).to.be.revertedWith(
        "owner cannot be address(0)"
      );
    });

    it("Should fail if one of the owners is duplicated", async function () {
      // We don't use the fixture here because we want a different deployment
      const [owner1, owner2, owner3, owner4, owner5] = await ethers.getSigners(); 
      const owners = [owner1.address, owner1.address, owner3.address, owner4.address, owner5.address];
      const approvalsRequired = 3;
      const depositAmount = ethers.utils.parseEther("100");
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(MultiSigWallet.deploy(owners, approvalsRequired, {value: depositAmount})).to.be.revertedWith(
        "duplicated owner"
      );
    });
  });

  describe("Submit transaction", function () {

    describe("Submit", function () {
      it("Should add a transaction proposal to the transactions list to be approved", async function () {
        const { wallet, receiver, data, amount } = await loadFixture(submitTransaction);

        const transaction = await wallet.transactions(0);

        expect(transaction[0]).to.equal(receiver);
        expect(transaction[1]).to.equal(data);
        expect(transaction[2]).to.equal(amount);
        expect(transaction[3]).to.equal(false);
        expect(transaction[4]).to.equal(0);
      });
    });  
    
    describe("Event", function () {
      it("Should emit an event when transaction is added", async function () {
        const { wallet, owners, receiver } = await loadFixture(deploy3of5MultiSigWallet);
        const amount = ethers.utils.parseEther("1.5");
        const abiCoder = new ethers.utils.AbiCoder;
        const data = abiCoder.encode(["string", "bytes"], ["TwitterContestV1", abiCoder.encode(["bytes"], ["0x"])]);

        await expect(wallet.submitTxn(receiver, data, amount))
          .to.emit(wallet, "Submit")
          .withArgs(owners[0], 0, receiver, amount, data);
      });
    });
  });

  describe("Approve transaction", function () {

    describe("Approve", function () {
      it("Should approve an existing transaction", async function () {
        const { wallet } = await loadFixture(submitTransaction);

        await wallet.approveTxn(0);
        const transaction = await wallet.transactions(0);

        expect(transaction[4]).to.equal(1);
      });
    });
  
    describe("Validations", function () {
      it("Should revert if transaction already approved", async function () {
        const { wallet } = await loadFixture(submitTransaction);

        await wallet.approveTxn(0);

        await expect(wallet.approveTxn(0)).to.be.revertedWith(
          "already approved"
        );
      });
    });

    describe("Event", function () {
      it("Should emit an event when transaction is added", async function () {
        const { wallet, owners } = await loadFixture(submitTransaction);

        await expect(wallet.approveTxn(0))
          .to.emit(wallet, "Approve")
          .withArgs(owners[0], 0);
      });
    });

  });

  describe("Revoke approval", function () {

    describe("Revoke", function () {
      it("Should revoke an existing transaction approval", async function () {
        const { wallet } = await loadFixture(submitTransaction);

        await wallet.approveTxn(0);
        await wallet.revokeApproval(0);
        const transaction = await wallet.transactions(0);

        expect(transaction[4]).to.equal(0);
      });
    });
  
    describe("Validations", function () {
      it("Should revert if transaction not yet approved", async function () {
        const { wallet } = await loadFixture(submitTransaction);

        await expect(wallet.revokeApproval(0)).to.be.revertedWith(
          "not yet approved"
        );
      });
    });

    describe("Event", function () {
      it("Should emit an event when transaction approval is revoked", async function () {
        const { wallet, owners } = await loadFixture(submitTransaction);

        await wallet.approveTxn(0);

        await expect(wallet.revokeApproval(0))
          .to.emit(wallet, "Revoke")
          .withArgs(owners[0], 0);
      });
    });

  });
});
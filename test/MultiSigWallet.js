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
    const [owner1, owner2, owner3, owner4, owner5, address1] = await ethers.getSigners(); 
    const owners = [owner1.address, owner2.address, owner3.address, owner4.address, owner5.address];
    const receiver = address1.address;
    const approvalsRequired = 3;
    const depositAmount = ethers.utils.parseEther("100");
   
    // Contracts are deployed using the first signer/account by default
    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
    const wallet = await MultiSigWallet.deploy(owners, approvalsRequired, {value: depositAmount});

    return { wallet, owners, approvalsRequired, depositAmount, receiver };
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
        const { wallet, receiver } = await loadFixture(deploy3of5MultiSigWallet);

        const amount = ethers.utils.parseEther("1.5");
        const abiCoder = new ethers.utils.AbiCoder;
        const data = abiCoder.encode(["string", "bytes"], ["TwitterContestV1", abiCoder.encode(["bytes"], ["0x"])]);
        await wallet.submitTxn(receiver, data, amount);
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
});

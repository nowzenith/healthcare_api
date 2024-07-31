const Web3 = require('web3').default;  // Explicitly importing default
const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const path = require('path');
const ethers = require('ethers');
const crypto = require('crypto');

const global_contract = "0x190302F594475581140523Ce12c4831d1018703B";

function generateKeyPairFromID(citizenID) {
    const hash = crypto.createHash('sha256').update(citizenID).digest('hex');
    let privateKey = '0x' + hash;
    const wallet = new ethers.Wallet(privateKey);
    return wallet;
}

async function web3init(cid) {
    const privateKey = generateKeyPairFromID(cid).privateKey.split("x")[1];
    const provider = new HDWalletProvider(privateKey, 'http://127.0.0.1:8545');
    const web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();
    console.log('Accounts:', accounts);
    await addCID(web3, cid);
    return { web3, provider };  // Return both web3 instance and provider
}

async function addCID(web3, cid) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json'); // Adjust path and contract name as necessary
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract; // Replace with your contract address

    const contract = new web3.eth.Contract(abi, contractAddress);

    const accounts = await web3.eth.getAccounts(); // Get list of accounts
    const account = accounts[0]; // Select account to interact with contract

    try {
        const receipt = await contract.methods.keepcid(cid, account).send({ from: account });
        console.log('Transaction receipt:', receipt);
    } catch (error) {
        console.error('Error calling keepCID:', error);
        if (error.error.code == -32003) {
            try {
                await sendETH(web3); // Sending ETH to cover potential gas shortages
                const receipt = await contract.methods.keepcid(cid, account).send({ from: account });
                console.log('Transaction receipt:', receipt);
            } catch (retryError) {
                console.error('Failed to assign role on retry:', retryError);
            }
        }
    }
}
async function sendETH(web3) {
    const senderAccount = web3.eth.accounts.privateKeyToAccount('0xeef1193fd29d8d6a031aba5422001aa84e63fec6132dfe37a61d15bbb3c0ba1c');
    web3.eth.accounts.wallet.add(senderAccount);  // Add the sender's account to your wallet

    // Fetch the list of accounts and securely pick the first one as the recipient
    const accounts = await web3.eth.getAccounts();
    const recipientAccount = accounts[0];  // Now safely accessing the first account

    const tx = {
        from: senderAccount.address,
        to: recipientAccount,  // Use the fetched account as the recipient
        value: web3.utils.toWei('0.1', 'ether'),  // Convert 1 ETH to Wei
        gas: 21000,  // The gas limit for standard transactions
        gasPrice: await web3.eth.getGasPrice()  // Get current gas price
    };

    try {
        const receipt = await web3.eth.sendTransaction(tx);
        console.log('Transaction successful:', receipt);
    } catch (error) {
        console.error('Transaction failed:', error);
    }
}

async function callPerformActionAsSuperAdmin(web3) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json'); // Adjust path and contract name as necessary
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract; // Replace with your contract address

    const contract = new web3.eth.Contract(abi, contractAddress);

    // Listen for the ActionPerformed event
    contract.events.ActionPerformed({
        fromBlock: 'latest'
    }, function (error, event) {
        if (error) {
            console.error('Error receiving event:', error);
        } else {
            console.log('Event Message:', event.returnValues.message);
        }
    });

    try {
        const accounts = await web3.eth.getAccounts();
        const result = await contract.methods.performSuperAdminTask().call({ from: accounts[0] });
        console.log(result);
    } catch (error) {
        console.error('Error performing action as superadmin');
    }
}

async function log_role(web3) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json'); // Adjust path and contract name as necessary
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract; // Replace with your contract address

    const contract = new web3.eth.Contract(abi, contractAddress);

    // Listen for the ActionPerformed event
    contract.events.ActionPerformed({
        fromBlock: 'latest'
    }, function (error, event) {
        if (error) {
            console.error('Error receiving event:', error);
        } else {
            console.log('Event Message:', event.returnValues.message);
        }
    });

    try {
        const accounts = await web3.eth.getAccounts();
        const result = await contract.methods.getAllAdminDCIDs().call({ from: accounts[0] });
        const result1 = await contract.methods.getAllAdminICIDs().call({ from: accounts[0] });
        const result2 = await contract.methods.getAllDoctorCIDs().call({ from: accounts[0] });
        const result3 = await contract.methods.getAllInsuranceCIDs().call({ from: accounts[0] });
        console.log('AdminD CIDs:', result);
        console.log('AdminI CIDs:', result1);
        console.log('Doctor CIDs:', result2);
        console.log('Insurance CIDs:', result3);
    } catch (error) {
        console.error(error);
    }
}

async function assignRole(web3, cid, role) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const { web3: web3_2, provider } = await web3init(cid);  // Correctly destructure 'web3' as 'web3_2'

    try {
        const accounts = await web3.eth.getAccounts();
        const recieve = await web3_2.eth.getAccounts();

        const tx = {
            from: accounts[0],  // This should be the SuperAdmin's account
            gas: await contract.methods.assignRole(recieve[0], role).estimateGas({ from: accounts[0] }),
            gasPrice: await web3.eth.getGasPrice()
        };

        const receipt = await contract.methods.assignRole(recieve[0], role).send(tx);
        console.log('Role assigned successfully:', receipt);
    } catch (error) {
        console.error('Failed to assign role:', error);
        if (error.error.code == -32003) {
            try {
                await sendETH(web3); // Sending ETH to cover potential gas shortages
                const accounts = await web3.eth.getAccounts();
                const recipientAccount = await web3_2.eth.getAccounts();
                const retryTx = {
                    from: recipientAccount[0],
                    gas: await contract.methods.assignRole(recipientAccount[0], role).estimateGas({ from: accounts[0] }),
                    gasPrice: await web3.eth.getGasPrice()
                };
                const retryReceipt = await contract.methods.assignRole(recipientAccount[0], role).send(retryTx);
                console.log('Role assigned successfully on retry:', retryReceipt);
            } catch (retryError) {
                console.error('Failed to assign role on retry:', retryError);
            }
        }

    }
}

async function removeAdminD(web3, cid) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract; // Use your actual deployed contract address here

    const contract = new web3.eth.Contract(abi, contractAddress);
    const { web3: web3_2, provider } = await web3init(cid);  // Correctly destructure 'web3' as 'web3_2'

    try {
        const accounts = await web3.eth.getAccounts();
        const recieve = await web3_2.eth.getAccounts();
        const superAdminAccount = accounts[0];  // Assuming the SuperAdmin is using the first account
        const Admin = recieve[0];

        const tx = {
            from: superAdminAccount,
            gas: await contract.methods.removeAdminD(Admin).estimateGas({ from: superAdminAccount }),
            gasPrice: await web3.eth.getGasPrice()
        };

        const receipt = await contract.methods.removeAdminD(Admin).send(tx);
        console.log('Admin removed successfully:', receipt);
    } catch (error) {
        console.error('Failed to remove admin:', error);
    }
}

async function readDataFromIPFS(cid) {
    const { create } = await import('kubo-rpc-client');
    const client = create(new URL('http://103.245.164.62/'));

    try {
        const chunks = [];
        for await (const chunk of client.cat(cid)) {
            chunks.push(chunk);
        }
        const data = Buffer.concat(chunks).toString();
        console.log('Read data from IPFS:', data);
        return data;
    } catch (error) {
        console.error('Error reading data from IPFS:', error);
    }
}

async function addDataToIPFS(jsonData) {
    const { create } = await import('kubo-rpc-client');
    const client = create(new URL('http://103.245.164.62/'));
    try {
        const buffer = Buffer.from(JSON.stringify(jsonData));
        const { cid } = await client.add(buffer);
        console.log('Added data CID:', cid.toString());
        return cid.toString();
    } catch (error) {
        console.error('Error adding data to IPFS:', error);
    }
}

async function addIPFSCID(web3, cid, ipfsCID, slot) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);

    const { web3: web3_2, provider } = await web3init(cid);

    try {
        const accounts = await web3.eth.getAccounts();
        const recieve = await web3_2.eth.getAccounts();
        const doctor = accounts[0];
        const patient = recieve[0];

        const receipt = await contract.methods.keepIPFSCID(patient, slot, ipfsCID).send({ from: doctor });
        console.log('IPFS CID mapped successfully:', receipt);
    } catch (error) {
        console.error('Error mapping IPFS CID:', error);
    }
}

async function getIPFSCIDByPublicKey(web3, cid, slot) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const { web3: web3_2, provider } = await web3init(cid);

    try {
        const accounts1 = await web3.eth.getAccounts();
        const accounts2 = await web3_2.eth.getAccounts();
        const ipfsCID = await contract.methods.getIPFSCIDsByPublicKeyAndSlot(accounts2[0], slot).call({ from: accounts1[0] });
        console.log('IPFS CID for public key', accounts2[0], 'is', ipfsCID);
        return ipfsCID;
    } catch (error) {
        console.error('Error getting IPFS CID by public key:', error);
    }
}

async function getLastIPFSCIDByPublicKey(web3, cid, slot) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const { web3: web3_2, provider } = await web3init(cid);

    try {
        const accounts1 = await web3.eth.getAccounts();
        const accounts2 = await web3_2.eth.getAccounts();
        const ipfsCID = await contract.methods.getLastIPFSCIDsByPublicKeyAndSlot(accounts2[0], slot).call({ from: accounts1[0] });
        console.log('IPFS CID for public key', accounts2[0], 'is', "http://103.245.164.62/ipfs/" + ipfsCID);
        return ipfsCID;
    } catch (error) {
        console.error('Error getting IPFS CID by public key:', error);
    }
}

async function requestAccess(web3, patientcid) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const accounts = await web3.eth.getAccounts();
    const { web3: web3_2, provider } = await web3init(patientcid);
    const accounts2 = await web3_2.eth.getAccounts();
    const doctor = accounts[0];
    const patient = accounts2[0];

    try {
        const receipt = await contract.methods.requestAccess(patient).send({ from: doctor });
        console.log('Access request sent:', receipt);
    } catch (error) {
        console.error('Error requesting access:', error);
    }
}

async function grantAccess(web3, doctorcid) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const accounts = await web3.eth.getAccounts();
    const { web3: web3_2, provider } = await web3init(doctorcid);
    const accounts2 = await web3_2.eth.getAccounts();
    const patient = accounts[0];
    const doctor = accounts2[0];

    try {
        const receipt = await contract.methods.grantAccess(doctor).send({ from: patient });
        console.log('Access granted:', receipt);
    } catch (error) {
        console.error('Error granting access:', error);
    }
}

async function revokeAccess(web3, doctorcid) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const accounts = await web3.eth.getAccounts();
    const { web3: web3_2, provider } = await web3init(doctorcid);
    const accounts2 = await web3_2.eth.getAccounts();
    const patient = accounts[0];
    const doctor = accounts2[0];

    try {
        const receipt = await contract.methods.revokeAccess(doctor).send({ from: patient });
        console.log('Access revoked:', receipt);
    } catch (error) {
        console.error('Error revoking access:', error);
    }
}

async function getAccessRequests(web3) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const accounts = await web3.eth.getAccounts();
    const patient = accounts[0];

    try {
        const accessRequests = await contract.methods.getAccessRequests().call({ from: patient });
        console.log('Access requests for patient', patient, 'are', accessRequests);
        return accessRequests;
    } catch (error) {
        console.error('Error getting access requests:', error);
    }
}

async function requestWriteAccess(web3, patientcid) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const accounts = await web3.eth.getAccounts();
    const { web3: web3_2, provider } = await web3init(patientcid);
    const accounts2 = await web3_2.eth.getAccounts();
    const doctor = accounts[0];
    const patient = accounts2[0];

    try {
        const receipt = await contract.methods.requestWriteAccess(patient).send({ from: doctor });
        console.log('Write access request sent:', receipt);
    } catch (error) {
        console.error('Error requesting write access:', error);
    }
}

async function grantWriteAccess(web3, doctorcid) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const accounts = await web3.eth.getAccounts();
    const { web3: web3_2, provider } = await web3init(doctorcid);
    const accounts2 = await web3_2.eth.getAccounts();
    const patient = accounts[0];
    const doctor = accounts2[0];

    try {
        const receipt = await contract.methods.grantWriteAccess(doctor).send({ from: patient });
        console.log('Write access granted:', receipt);
    } catch (error) {
        console.error('Error granting write access:', error);
    }
}

async function revokeWriteAccess(web3, doctorcid) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const accounts = await web3.eth.getAccounts();
    const { web3: web3_2, provider } = await web3init(doctorcid);
    const accounts2 = await web3_2.eth.getAccounts();
    const patient = accounts[0];
    const doctor = accounts2[0];

    try {
        const receipt = await contract.methods.revokeWriteAccess(doctor).send({ from: patient });
        console.log('Write access revoked:', receipt);
    } catch (error) {
        console.error('Error revoking write access:', error);
    }
}

async function approveTempIPFSCID(web3, doctorcid, index) {
    const contractPath = path.resolve(__dirname, 'build', 'contracts', 'RoleBasedAccessControl.json');
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const abi = contractJson.abi;
    const contractAddress = global_contract;

    const contract = new web3.eth.Contract(abi, contractAddress);
    const accounts = await web3.eth.getAccounts();
    const { web3: web3_2, provider } = await web3init(doctorcid);
    const accounts2 = await web3_2.eth.getAccounts();
    const patient = accounts[0];
    const doctor = accounts2[0];

    try {
        const receipt = await contract.methods.approveTempIPFSCID(doctor, index).send({ from: patient });
        console.log('Temporary IPFS CID approved:', receipt);
    } catch (error) {
        console.error('Error approving temporary IPFS CID:', error);
    }
}

async function test() {
    var { web3, provider } = await web3init("1");
    var role = 2;
    await assignRole(web3, "2", role);
    var { web3, provider } = await web3init("2");
    role = 0;
    await assignRole(web3, "3", role);
    var { web3, provider } = await web3init("3");
    await requestAccess(web3, "4");
    var { web3, provider } = await web3init("4");
    await getAccessRequests(web3);
}

async function main() {
    try {
        const { web3, provider } = await web3init("3");  // Await the promise to resolve and destructure the result
        const citizenData = { name: "John Doe 2", age: 30, medicalHistory: ["Allergy to peanuts"] };

        await getAccessRequests(web3);
        provider.engine.stop();  // Properly access provider to stop the engine
    } catch (error) {
        console.error('Error interacting with contract:', error);
    }
}

// main()
//     .then(() => console.log('Interaction successful'))
//     .catch((error) => console.error('Error in script execution:', error));

module.exports = {
    generateKeyPairFromID,
    web3init,
    addCID,
    sendETH,
    callPerformActionAsSuperAdmin,
    log_role,
    assignRole,
    removeAdminD,
    readDataFromIPFS,
    addDataToIPFS,
    addIPFSCID,
    getIPFSCIDByPublicKey,
    getLastIPFSCIDByPublicKey,
    requestAccess,
    grantAccess,
    revokeAccess,
    getAccessRequests,
    requestWriteAccess,
    grantWriteAccess,
    revokeWriteAccess,
    approveTempIPFSCID,
    test,
    main
};

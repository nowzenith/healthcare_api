const express = require('express');
const bodyParser = require('body-parser');
const server = require('./server'); // Adjust the path as necessary
const app = express();
const port = 3000;

var mysql = require('mysql');

var con = mysql.createConnection({
    host: "103.245.164.68",
    user: "now",
    password: "12345678",
    database: "hid"
});

app.use(bodyParser.json());

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function assignRole(basecid, targetcid, role) {
    try {
        var { web3, provider } = await server.web3init(basecid);
        await server.assignRole(web3, targetcid, role);
        await server.log_role(web3);
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function removeAdminD(basecid, targetcid) {
    try {
        var { web3, provider } = await server.web3init(basecid);
        await server.removeAdminD(web3, targetcid);
        await server.log_role(web3);
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function sendRequest(doctorcid, patientcid) {
    try {
        var { web3, provider } = await server.web3init(doctorcid);
        await server.requestAccess(web3, patientcid);
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function getAccessRequests(cid) {
    try {
        var { web3, provider } = await server.web3init(cid);
        await server.getAccessRequests(web3);
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function grantAccess(cid, targetcid) {
    try {
        var { web3, provider } = await server.web3init(cid);
        await server.grantAccess(web3, targetcid);
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function revokeAccess(cid, targetcid) {
    try {
        var { web3, provider } = await server.web3init(cid);
        await server.revokeAccess(web3, targetcid);
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function addData(cid, targetcid, file, data) {
    try {
        var { web3, provider } = await server.web3init(cid);
        const ipfsCID = await server.addDataToIPFS(data);
        await server.addIPFSCID(web3, targetcid, ipfsCID, file);
        con.connect(function (err) {
            if (err) throw err;
            console.log("Connected!");
            var sql = `INSERT INTO test (file, cid, ipfscid) VALUES ('${file}', '${targetcid}', '${ipfsCID}')`;
            con.query(sql, function (err, result) {
                if (err) throw err;
                console.log("1 record inserted");
            });
        });
        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
}
async function getData(cid, targetcid, file) {
    try {
        var { web3, provider } = await server.web3init(cid);
        return await server.getIPFSCIDByPublicKey(web3, targetcid, file);
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function getlastData(cid, targetcid, file) {
    try {
        var { web3, provider } = await server.web3init(cid);
        return await server.getLastIPFSCIDByPublicKey(web3, targetcid, file);
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function getAccessRequests(cid) {
    try {
        var { web3, provider } = await server.web3init(cid);
        return await server.getAccessRequests(web3);
    } catch (error) {
        console.log(error);
        return false;
    }
}

async function requestWriteAccess(doctorcid, patientcid) {
    try {
        var { web3, provider } = await server.web3init(doctorcid);
        await server.requestWriteAccess(web3, patientcid);
        return true;
    } catch (error) {
        return false;
    }
}

async function grantWriteAccess(patientcid, doctorcid) {
    try {
        var { web3, provider } = await server.web3init(patientcid);
        await server.grantWriteAccess(web3, doctorcid);
        return true;
    } catch (error) {
        return false;
    }
}

async function revokeWriteAccess(patientcid, doctorcid) {
    try {
        var { web3, provider } = await server.web3init(patientcid);
        await server.revokeWriteAccess(web3, doctorcid);
        return true;
    } catch (error) {
        return false;
    }
}

async function approveTempIPFSCID(cid, targetcid, file) {
    try {
        var { web3, provider } = await server.web3init(cid);
        await server.approveTempIPFSCID(web3, targetcid, file);
        return true;
    } catch (error) {
        return false;
    }
}

async function base() {
    await assignRole("1", "2", 2); //superadmin ให้ cid 2 เป็น adminหมอ
    await assignRole("1", "3", 3); //superadmin ให้ cid 3 เป็น adminประกัน
    await assignRole("2", "4", 0); //adminหมอ ให้ cid 4 เป็น หมอ
    await assignRole("3", "5", 1); //adminประกัน ให้ cid 5 เป็น ประกัน
    //สรุป
    // 2 -> admin หมอ
    // 3 -> admin ประกัน
    // 4 -> หมอ
    // 5 -> ประกัน
    return true;
}

async function test1() {
    // Test logic
}

async function test2() {
    await getAccessRequests("0");
    await delay(2000);
    await sendRequest("4", "0");
    await delay(2000);
    await getAccessRequests("0");
    await delay(2000);
    await revokeAccess("0", "4");
    await delay(2000);
    await getAccessRequests("0");
}

async function test3() {
    await getAccessRequests("0");
    await sendRequest("4", "0");
    await getAccessRequests("0");
    await grantAccess("0", "4");
    await getAccessRequests("0");
}

async function test4() {
    const citizenData = { file: 3, doctor: "4", medicalData: { "name": "now", "surname": "zenith", age: 22, "data": [1, "2", 3] } };
    await getData("4", "0", 3);
    await addData("4", "0", 3, citizenData);
    await getData("4", "0", 3);
    await getData("0", "0", 3);
    await getlastData("0", "0", 3);
}

app.get('/base', async (req, res) => {
    const success = await base();
    res.status(success ? 200 : 500).send({ success });
});

app.get('/assignRole', async (req, res) => {
    const { basecid, targetcid, role } = req.body;
    const success = await assignRole(basecid, targetcid, role);
    res.status(success ? 200 : 500).send({ success });
});

app.get('/removeAdminD', async (req, res) => {
    const { basecid, targetcid } = req.body;
    const success = await removeAdminD(basecid, targetcid);
    res.status(success ? 200 : 500).send({ success });
});

app.get('/sendRequest', async (req, res) => {
    const { doctorcid, patientcid } = req.body;
    const success = await sendRequest(doctorcid, patientcid);
    res.status(success ? 200 : 500).send({ success });
});

app.get('/getAccessRequests', async (req, res) => {
    const { cid } = req.body;
    const success = await getAccessRequests(cid);
    res.status(success ? 200 : 500).send({ success });
});

app.get('/grantAccess', async (req, res) => {
    const { cid, targetcid } = req.body;
    const success = await grantAccess(cid, targetcid);
    res.status(success ? 200 : 500).send({ success });
});

app.get('/revokeAccess', async (req, res) => {
    const { cid, targetcid } = req.body;
    const success = await revokeAccess(cid, targetcid);
    res.status(success ? 200 : 500).send({ success });
});

app.get('/addData', async (req, res) => {
    const { cid, targetcid, file, data } = req.body;
    const success = await addData(cid, targetcid, file, data);
    res.status(success ? 200 : 500).send({ success });
});

app.get('/getData', async (req, res) => {
    const { cid, targetcid, file } = req.body;
    const success = await getData(cid, targetcid, file);
    res.send(success);
});

app.get('/getlastData', async (req, res) => {
    const { cid, targetcid, file } = req.body;
    console.log(cid,targetcid,file);
    const success = await getlastData(cid, targetcid, file);
    res.status(success ? 200 : 500).send({ success });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

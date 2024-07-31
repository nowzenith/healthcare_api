const server = require('./server');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function assignRole(basecid, targetcid, role) {
    //Assuming 0 = Doctor, 1 = Insurance, 2 = AdminD, 3 = AdminI
    try {
        var { web3, provider } = await server.web3init(basecid);
        await server.assignRole(web3, targetcid, role);
        await server.log_role(web3);
        return true
    } catch (error) {
        return false
    }
}

async function removeAdminD(basecid, targetcid) {
    try {
        var { web3, provider } = await server.web3init(basecid);
        await server.removeAdminD(web3, targetcid);
        await server.log_role(web3);
        return true
    } catch (error) {
        return false
    }
}

async function sendRequest(doctorcid, patientcid) {
    try {
        var { web3, provider } = await server.web3init(doctorcid);
        await server.requestAccess(web3, patientcid);
        return true
    } catch (error) {
        return false
    }
}

async function getAccessRequests(cid) {
    try {
        var { web3, provider } = await server.web3init(cid);
        await server.getAccessRequests(web3);
        return true
    } catch (error) {
        return false
    }
}

async function grantAccess(cid, targetcid) {
    try {
        var { web3, provider } = await server.web3init(cid);
        await server.grantAccess(web3, targetcid);
        return true
    } catch (error) {
        return false
    }
}

async function revokeAccess(cid, targetcid) {
    try {
        var { web3, provider } = await server.web3init(cid);
        await server.revokeAccess(web3, targetcid);
        return true
    } catch (error) {
        return false
    }
}

async function addData(cid, targetcid, file, data) {
    try {
        var { web3, provider } = await server.web3init(cid);
        const ipfsCID = await server.addDataToIPFS(data);
        await server.addIPFSCID(web3, targetcid, ipfsCID, file);
        return true
    } catch (error) {
        return false
    }
}

async function getData(cid, targetcid, file) {
    try {
        var { web3, provider } = await server.web3init(cid);
        await server.getIPFSCIDByPublicKey(web3, targetcid, file);
        return true
    } catch (error) {
        return false
    }
}

async function getlastData(cid, targetcid, file) {
    try {
        var { web3, provider } = await server.web3init(cid);
        await server.getLastIPFSCIDByPublicKey(web3, targetcid, file);
        return true
    } catch (error) {
        return false
    }
}

async function base() {
    //Assuming 0 = Doctor, 1 = Insurance, 2 = AdminD, 3 = AdminI
    await assignRole("1", "2", 2); //superadmin ให้ cid 2 เป็น adminหมอ
    await assignRole("1", "3", 3); //superadmin ให้ cid 3 เป็น adminประกัน
    await assignRole("2", "4", 0); //adminหมอ ให้ cid 4 เป็น หมอ
    await assignRole("3", "5", 1); //adminประกัน ให้ cid 5 เป็น ประกัน
    //สรุป
    // 2 -> admin หมอ
    // 3 -> admin ประกัน
    // 4 -> หมอ
    // 5 -> ประกัน
}

async function test1() {

}

async function test2() {
    // หมอขอเข้าถึงข้อมูลคนไข้แล้วคนไข้ปฏิเสธ
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
    // หมอขอเข้าถึงข้อมูลคนไข้แล้วคนไข้อนุญาติ และดูว่าคนไข้มีหมอคนไหนที่เคยขอสิทธิ์บ้าง
    await getAccessRequests("0");
    // await delay(2000);
    await sendRequest("4", "0");
    // await delay(2000);
    await getAccessRequests("0");
    // await delay(2000);
    await grantAccess("0", "4");
    // await delay(2000);
    await getAccessRequests("0");
}

async function test4() {
    // หมอทำการส่งข้อมูลเข้าไปเก็บในsc และ เรียกดูข้อมูลด้วย หมอ-คนไข้ -> คนไข้ -> คนไข้อันล่าสุด
    const citizenData = { file: 3, doctor: "4", medicalData: { "name": "now", "surname": "zenith", age: 22, "data": [1, "2", 3] } };

    await getData("4", "0", 3);
    // await delay(2000);
    await addData("4", "0", 3, citizenData);
    // await delay(2000);
    await getData("4", "0", 3);
    // await delay(2000);
    await getData("0", "0", 3);
    // await delay(2000);
    await getlastData("0", "0", 3)
}



async function main() {
    // await base();
    // await test1();
    // await test2();
    // await test3();
}

main()
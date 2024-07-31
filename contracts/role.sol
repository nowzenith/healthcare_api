// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RoleBasedAccessControl {
    enum Role {
        Doctor,
        Insurance,
        AdminD,
        AdminI,
        SuperAdmin,
        Patient
    }

    // Mapping from address to role
    mapping(address => Role) public roles;
    // Mapping to check if an address has a role
    mapping(address => bool) public hasRole;

    // Separate storage for admins
    address[] private adminDs;

    address[] private adminIs;

    address[] private insurances;

    address[] private doctors;

    address public superAdmin;

    struct AccessRequest {
        address doctor;
        bool approved;
    }

    struct AccessWriteRequest {
        address doctor;
        bool approved;
    }

    struct TempIPFSCID {
        address publicKey;
        uint8 slot;
        string ipfsCID;
    }

    // Mapping from CID to public key
    mapping(address => string) public addressToCID;
    // Mapping from public key to a mapping of slots to arrays of IPFS CIDs
    mapping(address => mapping(uint8 => string[])) public publicKeyToIPFSCIDs;

    // Event to emit when a new mapping is created
    event CIDMapped(string cid, string publicKey);
    event IPFSCIDMapped(address publicKey, uint8 slot, string ipfsCID);

    mapping(address => string[]) public patientDataHistory; // Mapping from user address to array of data CIDs

    mapping(address => AccessRequest[]) public accessRequests;
    mapping(address => AccessWriteRequest[]) public accessWriteRequests;

    mapping(address => TempIPFSCID[]) public temporaryIPFSCIDs;

    event AccessRequested(address patient, address doctor);
    event AccessGranted(address patient, address doctor);
    event AccessRevoked(address patient, address doctor);

    event WriteAccessRequested(address patient, address doctor);
    event WriteAccessGranted(address patient, address doctor);
    event WriteAccessRevoked(address patient, address doctor);

    // Function to map a CID to a public key
    function keepcid(string memory cid, address publicKey) public {
        addressToCID[publicKey] = cid;
    }

    function getCIDByAddress(
        address _user
    ) public view returns (string memory) {
        require(
            bytes(addressToCID[_user]).length != 0,
            "No CID found for this address"
        );
        return addressToCID[_user];
    }

    // Event declaration
    event ActionPerformed(string message);

    constructor(address _superAdmin) {
        superAdmin = _superAdmin;
        roles[_superAdmin] = Role.SuperAdmin;
        hasRole[_superAdmin] = true;
    }

    modifier onlyRole(Role _role) {
        require(
            hasRole[msg.sender],
            "Unauthorized: sender does not have a role"
        );
        require(
            roles[msg.sender] == _role,
            "Unauthorized: sender does not have required role"
        );
        _;
    }

    function assignRole(address _user, Role _role) public {
        if (roles[msg.sender] == Role.SuperAdmin) {
            require(
                _role == Role.AdminD || _role == Role.AdminI,
                "SuperAdmin can only assign Admin roles"
            );
            if (!hasRole[_user]) {
                if (_role == Role.AdminD) adminDs.push(_user);
                if (_role == Role.AdminI) adminIs.push(_user);
            }
        } else if (
            roles[msg.sender] == Role.AdminD &&
            _role == Role.Doctor &&
            !hasRole[_user]
        ) {
            doctors.push(_user);
        } else if (
            roles[msg.sender] == Role.AdminI &&
            _role == Role.Insurance &&
            !hasRole[_user]
        ) {
            insurances.push(_user);
        } else {
            revert(
                "Unauthorized: sender cannot assign roles or role already assigned"
            );
        }
        _assignRole(_user, _role);
    }

    function _assignRole(address _user, Role _role) internal {
        roles[_user] = _role;
        hasRole[_user] = true;
    }

    function _removeRole(address _user) internal {
        hasRole[_user] = false; // Indicates the user no longer has any active role
    }

    function performActionAsDoctor() public onlyRole(Role.Doctor) {
        emit ActionPerformed("I am doctor");
    }

    function performAdminTask() public onlyRole(Role.AdminD) {
        emit ActionPerformed("I am adminD");
    }

    function performSuperAdminTask()
        public
        view
        onlyRole(Role.SuperAdmin)
        returns (string memory)
    {
        return "I am super admin";
    }

    function removeAddressFromArray(
        address _user,
        address[] storage array
    ) internal {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == _user) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }

    function removeAdminD(address _user) public onlyRole(Role.SuperAdmin) {
        if (roles[_user] == Role.AdminD) {
            removeAddressFromArray(_user, adminDs);
        }
        _removeRole(_user);
    }

    function removeAdminI(address _user) public onlyRole(Role.SuperAdmin) {
        if (roles[_user] == Role.AdminI) {
            removeAddressFromArray(_user, adminIs);
        }
        _removeRole(_user);
    }

    function removeInsurance(address _user) public onlyRole(Role.AdminI) {
        if (roles[_user] == Role.Insurance) {
            removeAddressFromArray(_user, insurances);
        }
        _removeRole(_user);
    }

    function removeDoctor(address _user) public onlyRole(Role.AdminD) {
        if (roles[_user] == Role.Doctor) {
            removeAddressFromArray(_user, doctors);
        }
        _removeRole(_user);
    }

    // Generalized function to get CIDs for a list of addresses
    function getCIDsByAddresses(address[] memory addresses) public view returns (string[] memory) {
        string[] memory cids = new string[](addresses.length);
        for (uint i = 0; i < addresses.length; i++) {
            cids[i] = addressToCID[addresses[i]];
        }
        return cids;
    }

    // Convenience functions to fetch CIDs for specific groups
    function getAllAdminDCIDs() public view returns (string[] memory) {
        return getCIDsByAddresses(adminDs);
    }

    function getAllAdminICIDs() public view returns (string[] memory) {
        return getCIDsByAddresses(adminIs);
    }

    function getAllDoctorCIDs() public view returns (string[] memory) {
        return getCIDsByAddresses(doctors);
    }

    function getAllInsuranceCIDs() public view returns (string[] memory) {
        return getCIDsByAddresses(insurances);
    }

    function getSuperAdmins() public view returns (address) {
        return superAdmin;
    }

    function keepIPFSCID(address publicKey, uint8 slot, string memory ipfsCID) public onlyRole(Role.Doctor) {
        require(hasAccessWrite(publicKey, msg.sender), "Unauthorized: sender does not have a permission");
        publicKeyToIPFSCIDs[publicKey][slot].push(ipfsCID);
        emit IPFSCIDMapped(publicKey, slot, ipfsCID);
    }

    function requestKeepIPFSCID(address publicKey, uint8 slot, string memory ipfsCID) public onlyRole(Role.Doctor) {
        require(hasAccessWrite(publicKey, msg.sender), "Unauthorized: sender does not have a permission");
        temporaryIPFSCIDs[msg.sender].push(TempIPFSCID({
            publicKey: publicKey,
            slot: slot,
            ipfsCID: ipfsCID
        }));
    }

    function approveTempIPFSCID(address doctor, uint index) public {
        TempIPFSCID memory tempCID = temporaryIPFSCIDs[doctor][index];
        require(hasAccessWrite(tempCID.publicKey, doctor), "Unauthorized: sender does not have a permission");
        publicKeyToIPFSCIDs[tempCID.publicKey][tempCID.slot].push(tempCID.ipfsCID);
        temporaryIPFSCIDs[doctor][index] = temporaryIPFSCIDs[doctor][temporaryIPFSCIDs[doctor].length - 1];
        temporaryIPFSCIDs[doctor].pop();
        emit IPFSCIDMapped(tempCID.publicKey, tempCID.slot, tempCID.ipfsCID);
    }

    function getIPFSCIDsByPublicKeyAndSlot(address publicKey, uint8 slot) public view returns (string[] memory) {
        require(publicKey == msg.sender || hasAccessRead(publicKey, msg.sender), "Unauthorized: sender does not have a permission");
        require(publicKeyToIPFSCIDs[publicKey][slot].length != 0, "No IPFS CIDs found for this public key");
        return publicKeyToIPFSCIDs[publicKey][slot];
    }

    function getLastIPFSCIDsByPublicKeyAndSlot(address publicKey, uint8 slot) public view returns (string memory) {
        require(publicKey == msg.sender || hasAccessRead(publicKey, msg.sender), "Unauthorized: sender does not have a permission");
        require(publicKeyToIPFSCIDs[publicKey][slot].length != 0, "No IPFS CIDs found for this public key");
        return publicKeyToIPFSCIDs[publicKey][slot][publicKeyToIPFSCIDs[publicKey][slot].length-1];
    }

    function requestAccess(address patient) public onlyRole(Role.Doctor) {
        require(patient != msg.sender, "Cannot request access to yourself");

        accessRequests[patient].push(AccessRequest({
            doctor: msg.sender,
            approved: false
        }));

        emit AccessRequested(patient, msg.sender);
    }

    function grantAccess(address doctor) public {
        AccessRequest[] storage requests = accessRequests[msg.sender];
        for (uint i = 0; i < requests.length; i++) {
            if (requests[i].doctor == doctor && !requests[i].approved) {
                requests[i].approved = true;
                emit AccessGranted(msg.sender, doctor);
                return;
            }
        }
        revert("No access request found for the specified doctor");
    }

    function revokeAccess(address doctor) public {
        AccessRequest[] storage requests = accessRequests[msg.sender];
        for (uint i = 0; i < requests.length; i++) {
            if (requests[i].doctor == doctor) {
                requests[i] = requests[requests.length - 1];
                requests.pop();
                emit AccessRevoked(msg.sender, doctor);
                return;
            }
        }
        revert("No access request found for the specified doctor");
    }

    function hasAccessRead(address patient, address doctor) public view returns (bool) {
        AccessRequest[] storage requests = accessRequests[patient];
        for (uint i = 0; i < requests.length; i++) {
            if (requests[i].doctor == doctor && requests[i].approved) {
                return true;
            }
        }
        return false;
    }

    function hasAccessWrite(address patient, address doctor) public view returns (bool) {
        AccessWriteRequest[] storage requests = accessWriteRequests[patient];
        for (uint i = 0; i < requests.length; i++) {
            if (requests[i].doctor == doctor && requests[i].approved) {
                return true;
            }
        }
        return false;
    }

    function requestWriteAccess(address patient) public onlyRole(Role.Doctor) {
        require(patient != msg.sender, "Cannot request access to yourself");

        accessWriteRequests[patient].push(AccessWriteRequest({
            doctor: msg.sender,
            approved: false
        }));

        emit WriteAccessRequested(patient, msg.sender);
    }

    function grantWriteAccess(address doctor) public {
        AccessWriteRequest[] storage requests = accessWriteRequests[msg.sender];
        for (uint i = 0; i < requests.length; i++) {
            if (requests[i].doctor == doctor && !requests[i].approved) {
                requests[i].approved = true;
                emit WriteAccessGranted(msg.sender, doctor);
                return;
            }
        }
        revert("No write access request found for the specified doctor");
    }

    function revokeWriteAccess(address doctor) public {
        AccessWriteRequest[] storage requests = accessWriteRequests[msg.sender];
        for (uint i = 0; i < requests.length; i++) {
            if (requests[i].doctor == doctor) {
                requests[i] = requests[requests.length - 1];
                requests.pop();
                emit WriteAccessRevoked(msg.sender, doctor);
                return;
            }
        }
        revert("No write access request found for the specified doctor");
    }

    function getAccessRequests() public view returns (AccessRequest[] memory) {
        return accessRequests[msg.sender];
    }

    function getWriteAccessRequests() public view returns (AccessWriteRequest[] memory) {
        return accessWriteRequests[msg.sender];
    }
}

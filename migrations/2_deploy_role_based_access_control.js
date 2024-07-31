const RoleBasedAccessControl = artifacts.require("RoleBasedAccessControl");

module.exports = function(deployer, network, accounts) {
  const superAdminAddress = "0x1EE4a89D2518AeaB5D1c8d70e4F60EBb6ad02015"; // Using the first account as superAdmin
  deployer.deploy(RoleBasedAccessControl, superAdminAddress);
};

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
// solhint-disable-next-line compiler-version
pragma abicoder v2;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import 'hardhat/console.sol';

contract GuardianVault is OwnableUpgradeable {
  uint256 public timelockPeriod;
  uint256 public requiredBond;

  mapping(address => uint256) public guardians;

  event GuardianAdded(address guardian);
  event GuardianRemoved(address guardian);
  event GuardianChecked(address guardian);

  function _isGuardian(address _suspect) private view returns (bool) {
    uint256 _guardianCreateTime = guardians[_suspect];
    if (_guardianCreateTime == 0) {
      return false;
    }
    // solhint-disable-next-line not-rely-on-time
    if (block.timestamp > (_guardianCreateTime + timelockPeriod)) {
      return true;
    }
    return false;
  }

  /**
   * @notice Throws if the sender is not a guardian.
   */
  // modifier guardianOnly {
  //   require(_isGuardian(_msgSender()), 'Sender not authorized');
  //   _;
  // }

  function initialize(address[] memory _guardians) public initializer {
    __Ownable_init();
    timelockPeriod = 1 days;
    requiredBond = 0 ether;

    for (uint256 i = 0; i < _guardians.length; i++) {
      address newGuardian = _guardians[i];
      require(newGuardian != address(0), 'Cant use ZeroAddress as Guardian');

      guardians[newGuardian] = 1; // From the beginning = immediatly active
    }
  }

  function setTimelockPeriod(uint256 _timelockPeriod) public onlyOwner {
    timelockPeriod = _timelockPeriod;
  }

  function getTimelockPeriod() public view returns (uint256) {
    return timelockPeriod;
  }

  function setRequiredBond(uint256 _requiredBond) public onlyOwner {
    requiredBond = _requiredBond;
  }

  function getRequiredBond() public view returns (uint256) {
    return requiredBond;
  }

  function addGuardian(address _guardian) public onlyOwner {
    require(_guardian != address(0), 'Cant use ZeroAddress as Guardian');
    require(guardians[_guardian] == 0, 'Guardian is already added');

    // solhint-disable-next-line not-rely-on-time
    guardians[_guardian] = block.timestamp;
    emit GuardianAdded(_guardian);
  }

  function removeGuardian(address _guardian) public onlyOwner {
    require(guardians[_guardian] > 0, 'Guardian does not exist');

    guardians[_guardian] = 0;
    emit GuardianRemoved(_guardian);
  }

  function isGuardian() public view returns (bool) {
    return _isGuardian(_msgSender());
  }

  function isGuardian(address _suspect) public view returns (bool) {
    return _isGuardian(_suspect);
  }
}

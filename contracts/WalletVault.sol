// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
// solhint-disable-next-line compiler-version
pragma abicoder v2;

import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/utils/Address.sol';

import './infra/GuardianVault.sol';

contract WalletVault is Context {
  using SafeMath for uint256;
  using Address for address;

  InfraGuardianVault gv;

  event Received(uint256 indexed value, address indexed sender, bytes data);
  event Invoked(address indexed target, uint256 indexed value, bytes data);

  constructor(InfraGuardianVault _gv, address _owner) {
    gv = _gv;
    address[] memory trusted = new address[](1);
    trusted[0] = _owner;
    _gv.register(address(this), trusted, trusted);
  }

  modifier onlyTrusted(address _suspect) {
    require(gv.isTrusted(address(this), _suspect), 'Sender not trusted');
    _;
  }

  receive() external payable {
    emit Received(msg.value, _msgSender(), _msgData());
  }

  function invoke(
    address _target,
    uint256 _value,
    bytes calldata _data
  ) external onlyTrusted(_msgSender()) returns (bytes memory _result) {
    emit Invoked(_target, _value, _data);
    return _target.functionCallWithValue(_data, _value);
  }
}

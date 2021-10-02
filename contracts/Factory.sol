// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;
// solhint-disable-next-line compiler-version
pragma abicoder v2;

import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/Create2.sol';

import './WalletVault.sol';

contract Factory is Context {
  using ECDSA for bytes32;

  event WalletCreated(address wallet, address owner, address gv, uint256 nonce);

  function _getByteCode(address _gvAddress, address _owner)
    public
    pure
    returns (bytes memory)
  {
    return
      abi.encodePacked(
        type(WalletVault).creationCode,
        abi.encode(_gvAddress, _owner)
      );
  }

  function computeAddress(
    address owner,
    address _gvAddress,
    uint256 nonce
  ) external view returns (address) {
    // This recreates the message hash that was signed on the client.
    bytes32 hash = keccak256(abi.encodePacked(owner, _gvAddress, nonce));

    return
      Create2.computeAddress(hash, keccak256(_getByteCode(_gvAddress, owner)));
  }

  function deploy(
    address owner,
    address _gvAddress,
    uint256 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external returns (address) {
    // This recreates the message hash that was signed on the client.
    bytes32 hash = keccak256(abi.encodePacked(owner, _gvAddress, nonce));

    // Verify that the message's signer is the owner of the order
    require(
      hash.toEthSignedMessageHash().recover(v, r, s) == owner,
      'Not allowed'
    );

    address wallet = Create2.deploy(0, hash, _getByteCode(_gvAddress, owner));

    emit WalletCreated(wallet, owner, _gvAddress, nonce);

    return wallet;
  }
}

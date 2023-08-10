"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnChainResolver = void 0;
const onchain_revocation_1 = require("../../storage/blockchain/onchain-revocation");
const js_iden3_core_1 = require("@iden3/js-iden3-core");
const blockchain_1 = require("../../storage/blockchain");
const ethers_1 = require("ethers");
/**
 * OnChainIssuer is a class that allows to interact with the onchain contract
 * and build the revocation status.
 *
 * @public
 * @class OnChainIssuer
 */
class OnChainResolver {
    /**
     *
     * Creates an instance of OnChainIssuer.
     * @public
     * @param {Array<EthConnectionConfig>} - onchain contract address
     * @param {string} - list of EthConnectionConfig
     */
    constructor(_configs) {
        this._configs = _configs;
    }
    /**
     * resolve is a method to resolve a credential status from the blockchain.
     *
     * @public
     * @param {CredentialStatus} credentialStatus -  credential status to resolve
     * @param {CredentialStatusResolveOptions} credentialStatusResolveOptions -  options for resolver
     * @returns `{Promise<RevocationStatus>}`
     */
    async resolve(credentialStatus, credentialStatusResolveOptions) {
        if (!credentialStatusResolveOptions?.issuerDID) {
            throw new Error('IssuerDID is not set in options');
        }
        return this.getRevocationOnChain(credentialStatus, credentialStatusResolveOptions.issuerDID);
    }
    /**
     * Gets partial revocation status info from onchain issuer contract.
     *
     * @param {CredentialStatus} credentialStatus - credential status section of credential
     * @param {DID} issuerDid - issuer did
     * @returns `{Promise<RevocationStatus>}`
     */
    async getRevocationOnChain(credentialStatus, issuer) {
        const { contractAddress, chainId, revocationNonce } = this.extractCredentialStatusInfo(credentialStatus);
        if (revocationNonce !== credentialStatus.revocationNonce) {
            throw new Error('revocationNonce does not match');
        }
        const networkConfig = this.networkByChainId(chainId);
        const onChainCaller = new onchain_revocation_1.OnChainRevocationStorage(networkConfig, contractAddress);
        const id = js_iden3_core_1.DID.idFromDID(issuer);
        const revocationStatus = await onChainCaller.getRevocationStatus(id.bigInt(), revocationNonce);
        return revocationStatus;
    }
    /**
     * Extract information about credential status
     *
     * @param {credentialStatus} CredentialStatus - credential status
     * @returns {{contractAddress: string, chainId: number, revocationNonce: number, issuer: string;}}
     */
    extractCredentialStatusInfo(credentialStatus) {
        if (!credentialStatus.id) {
            throw new Error('credentialStatus id is empty');
        }
        const idParts = credentialStatus.id.split('/');
        if (idParts.length !== 2) {
            throw new Error('invalid credentialStatus id');
        }
        const issuer = idParts[0];
        const issuerDID = js_iden3_core_1.DID.parse(issuer);
        const idURL = new URL(credentialStatus.id);
        // if contractAddress is not present in id as param, then it should be parsed from DID
        let contractAddress = idURL.searchParams.get('contractAddress');
        let chainId;
        if (!contractAddress) {
            const issuerId = js_iden3_core_1.DID.idFromDID(issuerDID);
            const ethAddr = js_iden3_core_1.Id.ethAddressFromId(issuerId);
            contractAddress = ethers_1.utils.getAddress(ethers_1.utils.hexDataSlice(ethAddr, 0));
            const blockchain = js_iden3_core_1.DID.blockchainFromId(issuerId);
            const network = js_iden3_core_1.DID.networkIdFromId(issuerId);
            chainId = (0, blockchain_1.getChainIdByDIDsParts)(issuerDID.method, blockchain, network);
        }
        else {
            const parts = contractAddress.split(':');
            if (parts.length != 2) {
                throw new Error('invalid contract address encoding. should be chainId:contractAddress');
            }
            chainId = parseInt(parts[0], 10);
            contractAddress = parts[1];
        }
        // if revocationNonce is not present in id as param, then it should be extract from credentialStatus
        const rv = idURL.searchParams.get('revocationNonce') || credentialStatus.revocationNonce;
        if (rv === undefined || rv === null) {
            throw new Error('revocationNonce not found in credentialStatus id field');
        }
        const revocationNonce = typeof rv === 'number' ? rv : parseInt(rv, 10);
        return { contractAddress, chainId, revocationNonce, issuer };
    }
    networkByChainId(chainId) {
        const network = this._configs.find((c) => c.chainId === chainId);
        if (!network) {
            throw new Error(`chainId "${chainId}" not supported`);
        }
        return network;
    }
}
exports.OnChainResolver = OnChainResolver;
//# sourceMappingURL=on-chain-revocation.js.map
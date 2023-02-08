const near = require('near-api-js')

const nearUtils = async ({ contractId, method, args = {} }) => {

    // Make a read-only call to retrieve information from the network

    const provider = new near.providers.JsonRpcProvider({ url: 'https://rpc.mainnet.near.org'  });
    console.log(contractId)
    try {
        let res = await provider.query({
            request_type: 'call_function',
            account_id: contractId,
            method_name: method,
            args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
            finality: 'optimistic',
        });
        return JSON.parse(Buffer.from(res.result).toString());
    } catch (err) {
        console.log(err);
        throw err
    }
}
module.exports = nearUtils
const midtransClient = require('midtrans-client')

export const getMidtransSnapClient = () => {
  const config = {
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
  }
  
  console.log('Midtrans Config:', {
    isProduction: config.isProduction,
    hasServerKey: !!config.serverKey,
    hasClientKey: !!config.clientKey,
    serverKeyPrefix: config.serverKey?.substring(0, 15),
  })
  
  return new midtransClient.Snap(config)
}

export const getMidtransCoreApiClient = () => {
  return new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
  })
}

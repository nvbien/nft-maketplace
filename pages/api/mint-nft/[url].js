// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { useState } from 'react'
import { ethers } from 'ethers'
import { create as ipfsHttpClient } from 'ipfs-http-client'
import Web3Modal from 'web3modal'
const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

import {
    marketplaceAddress,
    homePage
  } from '../../../config'
  
import NFTMarketplace from '../../../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json'

export default async function handler(req, res) {
    const {  url : fileUrl , name, description, price: inputPrice } = req.query;
    const url = await uploadToIPFS(fileUrl, name, description, inputPrice);
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    /* create the NFT */
    const price = ethers.utils.parseUnits(inputPrice, 'ether')
    let contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    let listingPrice = await contract.getListingPrice()
    listingPrice = listingPrice.toString()
    let transaction = await contract.createToken(url, price, { value: listingPrice })
    await transaction.wait();
    res.status(200).json({ url: homePage })
}


async function uploadToIPFS(fileUrl, name, description, price) {
    if (!name || !description || !price || !fileUrl) return
    /* first, upload metadata to IPFS */
    const data = JSON.stringify({
      name, description, image: fileUrl
    })
    try {
      const added = await client.add(data)
      const url = `https://ipfs.infura.io/ipfs/${added.path}`
      /* after metadata is uploaded to IPFS, return the URL to use it in the transaction */
      return url
    } catch (error) {
      console.log('Error uploading file: ', error)
    }  
  }
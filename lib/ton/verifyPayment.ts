// lib/ton/verifyPayment.ts

import axios from "axios";

export async function verifyTonPayment({
  userAddress,
  amountTON,
  adminWallet,
}: {
  userAddress: string;
  amountTON: number;
  adminWallet: string;
}): Promise<boolean> {
  try {
    const response = await axios.get(
      `https://tonapi.io/v1/blockchain/accounts/${userAddress}/transactions`,
      {
        headers: {
          Authorization: `Bearer ${process.env.TONAPI_KEY || ""}`,
        },
        params: {
          limit: 10,
        },
      }
    );

    const txs = response.data.transactions;

    const validTx = txs.find((tx: any) => {
      const isToAdmin = tx.in_msg?.destination === adminWallet;
      const isAmountOk =
        parseFloat(tx.in_msg?.value || "0") / 1e9 >= amountTON;
      const isRecent =
        new Date(tx.utime * 1000).getTime() >= Date.now() - 5 * 60 * 1000;

      return isToAdmin && isAmountOk && isRecent;
    });

    return !!validTx;
  } catch (err) {
    console.error("خطأ في التحقق من الدفع:", err);
    return false;
  }
}
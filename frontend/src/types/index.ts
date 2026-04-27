export type User = {
  id: number;
  username: string;
  fullName: string;
  role: string;
};

export type Payment = {
  id: number;
  userId?: number;
  customerName?: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  swiftCode: string;
  currency: string;
  amount: number;
  reference: string;
  status: string;
  createdAt: string;
};

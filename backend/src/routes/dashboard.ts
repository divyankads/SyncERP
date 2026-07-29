import { Router } from 'express';
import { CustomerModel, ProductModel, InvoiceModel, PurchaseOrderModel, CRMFollowupModel, ChallanModel } from '../db/mongo';
import { asyncHandler } from '../middleware/validate';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const [
    totalCustomers,
    totalProducts,
    lowStockCount,
    revenueRes,
    pendingRes,
    openPOs,
    pendingFollowups,
    recentInvoices,
    topProductsRes,
    monthlySalesRes,
  ] = await Promise.all([
    CustomerModel.countDocuments({ status: { $regex: /active|lead/i } }),
    ProductModel.countDocuments({}),
    ProductModel.countDocuments({ $expr: { $lte: ['$stockQty', '$minStock'] } }),
    InvoiceModel.aggregate([{ $group: { _id: null, r: { $sum: '$totalAmount' } } }]),
    InvoiceModel.aggregate([
      { $match: { status: { $ne: 'paid' } } },
      { $group: { _id: null, p: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } }
    ]),
    PurchaseOrderModel.countDocuments({ status: { $in: ['draft', 'confirmed'] } }),
    CRMFollowupModel.countDocuments({ status: 'pending' }),
    InvoiceModel.find().sort({ createdAt: -1 }).limit(5).lean(),
    ChallanModel.aggregate([
      { $match: { status: { $in: ['delivered', 'dispatched'] } } },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          sku: { $first: '$items.sku' },
          total_sold: { $sum: '$items.qty' },
          revenue: { $sum: '$items.total' }
      } },
      { $sort: { total_sold: -1 } },
      { $limit: 5 }
    ]),
    InvoiceModel.aggregate([
      { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$totalAmount' }
      } },
      { $sort: { _id: -1 } },
      { $limit: 6 }
    ]),
  ]);

  const formattedInvoices = recentInvoices.map((inv: any) => ({
    id: inv._id.toString(),
    ...inv,
    customer_name: inv.customerName || inv.customer_name || 'Customer'
  }));

  const formattedMonthlySales = monthlySalesRes.map((m: any) => ({
    month: m._id,
    total: m.total
  })).reverse();

  res.json({
    totalCustomers,
    totalProducts,
    lowStockCount,
    totalRevenue: revenueRes[0]?.r || 0,
    pendingAmount: pendingRes[0]?.p || 0,
    openPOs,
    pendingFollowups,
    recentInvoices: formattedInvoices,
    topProducts: topProductsRes,
    monthlySales: formattedMonthlySales,
  });
}));

export default router;

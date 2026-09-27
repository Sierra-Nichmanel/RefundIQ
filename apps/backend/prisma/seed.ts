import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const customers = [
  { firstName: "Amara", lastName: "Okafor" },
  { firstName: "David", lastName: "Bennett" },
  { firstName: "Sofia", lastName: "Martinez" },
  { firstName: "Daniel", lastName: "Brooks" },
  { firstName: "Grace", lastName: "Adeyemi" },
  { firstName: "Ethan", lastName: "Cole" },
  { firstName: "Chloe", lastName: "Morgan" },
  { firstName: "Samuel", lastName: "Reed" },
  { firstName: "Zara", lastName: "Ibrahim" },
  { firstName: "Noah", lastName: "Williams" },
  { firstName: "Mia", lastName: "Thompson" },
  { firstName: "Tunde", lastName: "Balogun" },
  { firstName: "Olivia", lastName: "Carter" },
  { firstName: "James", lastName: "Wilson" },
  { firstName: "Nina", lastName: "Patel" },
];

type OrderSeed = {
  itemName: string;
  totalAmount: number;
  daysAgo: number;
  isFinalSale?: boolean;
};

const orderHistories: OrderSeed[][] = [
  [
    { itemName: "Wireless Headphones", totalAmount: 129.99, daysAgo: 5 },
    { itemName: "Smartphone Case", totalAmount: 24.99, daysAgo: 45 },
  ],
  [
    { itemName: "Laptop Pro", totalAmount: 1299.99, daysAgo: 12 },
    { itemName: "USB-C Hub", totalAmount: 79.99, daysAgo: 20 },
  ],
  [
    { itemName: "Running Shoes", totalAmount: 89.99, daysAgo: 8 },
    {
      itemName: "Clearance Jacket",
      totalAmount: 59.99,
      daysAgo: 15,
      isFinalSale: true,
    },
  ],
  [
    { itemName: "Gaming Monitor", totalAmount: 549.99, daysAgo: 6 },
    { itemName: "Mechanical Keyboard", totalAmount: 119.99, daysAgo: 35 },
  ],
  [
    { itemName: "Smart Watch", totalAmount: 249.99, daysAgo: 10 },
    { itemName: "Fitness Band", totalAmount: 49.99, daysAgo: 110 },
  ],
  [
    { itemName: "Bluetooth Speaker", totalAmount: 99.99, daysAgo: 3 },
    { itemName: "Premium Camera", totalAmount: 899.99, daysAgo: 9 },
  ],
  [
    { itemName: "Office Chair", totalAmount: 399.99, daysAgo: 18 },
    { itemName: "Desk Lamp", totalAmount: 44.99, daysAgo: 25 },
  ],
  [
    { itemName: "Tablet", totalAmount: 699.99, daysAgo: 7 },
    { itemName: "Tablet Screen Protector", totalAmount: 19.99, daysAgo: 30 },
  ],
  [
    { itemName: "Winter Coat", totalAmount: 189.99, daysAgo: 14 },
    {
      itemName: "Final Sale Scarf",
      totalAmount: 29.99,
      daysAgo: 5,
      isFinalSale: true,
    },
  ],
  [
    { itemName: "4K Television", totalAmount: 799.99, daysAgo: 4 },
    { itemName: "HDMI Cable", totalAmount: 14.99, daysAgo: 60 },
  ],
  [
    { itemName: "Air Purifier", totalAmount: 279.99, daysAgo: 11 },
    { itemName: "Replacement Filter", totalAmount: 39.99, daysAgo: 40 },
  ],
  [
    { itemName: "Gaming Console", totalAmount: 499.99, daysAgo: 16 },
    { itemName: "Wireless Controller", totalAmount: 69.99, daysAgo: 95 },
  ],
  [
    { itemName: "Dining Table", totalAmount: 649.99, daysAgo: 9 },
    { itemName: "Tableware Set", totalAmount: 149.99, daysAgo: 22 },
  ],
  [
    { itemName: "Electric Toothbrush", totalAmount: 79.99, daysAgo: 2 },
    { itemName: "Hair Dryer", totalAmount: 119.99, daysAgo: 130 },
  ],
  [
    { itemName: "Studio Microphone", totalAmount: 349.99, daysAgo: 13 },
    { itemName: "Audio Interface", totalAmount: 229.99, daysAgo: 28 },
  ],
];

async function main() {
  console.log("Starting RefundIQ database seed...");

  // Clear dependent records first so the script is repeatable.
  await prisma.auditLog.deleteMany();
  await prisma.refundRequest.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  const now = new Date();

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];

    if (!customer) continue;

    const email = `customer${String(i + 1).padStart(2, "0")}@example.com`;

    const createdCustomer = await prisma.customer.create({
      data: {
        ...customer,
        email,
      },
    });

    const customerOrders = orderHistories[i];

    if (!customerOrders) continue;

    for (let j = 0; j < customerOrders.length; j++) {
      const order = customerOrders[j];

      if (!order) continue;

      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - order.daysAgo);

      // Synthetic orders are delivered two days after purchase.
      const deliveredAt = new Date(orderDate);
      deliveredAt.setDate(deliveredAt.getDate() + 2);

      await prisma.order.create({
        data: {
          orderNumber: `RFQ-${String(i + 1).padStart(3, "0")}-${String(j + 1).padStart(2, "0")}`,
          customerId: createdCustomer.id,
          totalAmount: order.totalAmount,
          currency: "USD",
          status: "DELIVERED",
          itemName: order.itemName,
          isFinalSale: order.isFinalSale ?? false,
          orderDate,
          deliveredAt,
        },
      });
    }

    console.log(`Seeded ${email}`);
  }

  const customerCount = await prisma.customer.count();
  const orderCount = await prisma.order.count();

  console.log("RefundIQ seed completed.");
  console.log(`Customers: ${customerCount}`);
  console.log(`Orders: ${orderCount}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

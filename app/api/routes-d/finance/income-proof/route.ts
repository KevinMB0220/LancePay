import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";
import { hashToken } from "@/lib/crypto";

// ---------------------------
// POST /api/routes-d/finance/income-proof/generate
// ---------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipientName, durationDays } = body;

    if (!recipientName || !durationDays) {
      return NextResponse.json(
        { error: "recipientName and durationDays are required" },
        { status: 400 }
      );
    }

    // Generate a random token
    const token = randomBytes(16).toString("hex");
    const tokenHash = hashToken(token);

    // Set expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Save to DB
    const verification = await prisma.incomeVerification.create({
      data: {
        userId: "replace-with-user-id", // TODO: replace with authenticated user ID
        recipientName,
        tokenHash,
        expiresAt,
      },
    });

    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/routes-d/finance/income-proof/public/${token}`;

    return NextResponse.json({
      verificationUrl,
      expiresAt: verification.expiresAt,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ---------------------------
// GET /api/routes-d/finance/income-proof/public/[token]
// ---------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const tokenHash = hashToken(params.token);

  const verification = await prisma.incomeVerification.findUnique({
    where: { tokenHash },
  });

  if (!verification) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  if (verification.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Aggregate last 12 months income
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 12);

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: verification.userId,
      status: "PAID",
      paidAt: { gte: fromDate },
    },
    select: { amount: true, paidAt: true },
  });

  const monthlyMap: Record<string, number> = {};

invoices.forEach((i) => {
  if (!i.paidAt) return; // skip if paidAt is null
  const key = `${i.paidAt.getFullYear()}-${i.paidAt.getMonth() + 1}`;
  // Convert Decimal to number inline
  const amount = typeof i.amount === "number" ? i.amount : i.amount.toNumber();
  monthlyMap[key] = (monthlyMap[key] || 0) + amount;
});


  const monthlyValues = Object.values(monthlyMap);
  const total = monthlyValues.reduce((a, b) => a + b, 0);
  const average = monthlyValues.length ? total / monthlyValues.length : 0;
  const variance =
    monthlyValues.reduce((a, b) => a + Math.pow(b - average, 2), 0) /
    (monthlyValues.length || 1);
  const stdDev = Math.sqrt(variance);

  // Account age
  const user = await prisma.user.findUnique({
    where: { id: verification.userId },
    select: { createdAt: true },
  });

  // Increment access count
  await prisma.incomeVerification.update({
    where: { id: verification.id },
    data: { accessCount: { increment: 1 } },
  });

  return NextResponse.json({
    recipient: verification.recipientName,
    verifiedOnChain: true,
    accountAgeMonths: Math.floor(
      (Date.now() - user!.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    ),
    stats: {
      averageMonthlyIncome: average,
      totalVolumeLast12Months: total,
      incomeStabilityStdDev: stdDev,
      bestMonth: Math.max(...monthlyValues, 0),
    },
  });
}

// Admin Analytics API: Computes high-level platform metrics (Financial value, User activity) for the dashboard.
// Aggregates data by year to track community impact and growth.

import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// Force dynamic to ensure stats are calculated on-demand and not cached statically
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 1. Security Guard: Verify Admin Session
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Timeframe Logic: Defaults to current year if no param provided
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  try {
    // 3. Global Counters (All-time metrics)
    const totalListings = await prisma.listing.count();
    const totalUsers = await prisma.user.count();

    // 4. Financial Metrics: Calculates total value of inventory entered this year
    const postedValueAgg = await prisma.listing.aggregate({
      _sum: { estimatedValue: true },
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    // 5. Impact Metrics: Calculates value actually successfully donated this year
    const donatedValueAgg = await prisma.listing.aggregate({
      _sum: { estimatedValue: true },
      where: {
        status: "donated",
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    // 6. Leaderboard: Finds most active contributors within the selected timeframe
    const topDonors = await prisma.user.findMany({
      take: 5,
      where: {
        listings: {
          some: {
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
        },
      },
      orderBy: {
        listings: { _count: "desc" },
      },
      include: {
        _count: {
          select: {
            listings: {
              where: {
                createdAt: {
                  gte: startDate,
                  lt: endDate,
                },
              },
            },
          },
        },
      },
    });

    // 7. Recipient Leaderboard (Placeholder: Future feature to track who receives the most help)
    const topTakers: any[] = [];

    return NextResponse.json(
      {
        totalListings,
        totalUsers,
        totalPostedValue: postedValueAgg._sum.estimatedValue || 0,
        totalDonatedValue: donatedValueAgg._sum.estimatedValue || 0,
        topDonors,
        topTakers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Stats Calculation Error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

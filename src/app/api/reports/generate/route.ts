import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { generateReport } from "@/lib/gemini/client";
import {
  generateRevenueSummaryData,
  generateProductAnalysisData,
  generateCustomerInsightsData,
  generateFullAnalysisData,
} from "@/lib/reports/templates";
import { ReportType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const store = await getStore();

    if (!store) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { type, startDate, endDate } = await request.json();

    if (!type || !["REVENUE_SUMMARY", "PRODUCT_ANALYSIS", "CUSTOMER_INSIGHTS", "FULL_ANALYSIS"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 }
      );
    }

    // Create report record
    const report = await prisma.report.create({
      data: {
        storeId: store.id,
        type: type as ReportType,
        title: getReportTitle(type),
        status: "GENERATING",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        content: {},
      },
    });

    try {
      // Generate report data
      let reportData;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      switch (type) {
        case "REVENUE_SUMMARY":
          reportData = await generateRevenueSummaryData(store.id, start, end);
          break;
        case "PRODUCT_ANALYSIS":
          reportData = await generateProductAnalysisData(store.id, start, end);
          break;
        case "CUSTOMER_INSIGHTS":
          reportData = await generateCustomerInsightsData(store.id);
          break;
        case "FULL_ANALYSIS":
          reportData = await generateFullAnalysisData(store.id);
          break;
        default:
          throw new Error("Invalid report type");
      }

      // Generate AI summary
      const summary = await generateReport(
        type,
        JSON.stringify(reportData.metrics, null, 2),
        store.name
      );

      // Update report with data and summary
      const updatedReport = await prisma.report.update({
        where: { id: report.id },
        data: {
          content: reportData,
          summary,
          status: "COMPLETED",
        },
      });

      return NextResponse.json(updatedReport);
    } catch (generationError) {
      // Mark report as failed to prevent orphan reports
      await prisma.report.update({
        where: { id: report.id },
        data: { status: "FAILED" },
      });
      throw generationError;
    }
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

function getReportTitle(type: string): string {
  switch (type) {
    case "REVENUE_SUMMARY":
      return "Revenue Summary Report";
    case "PRODUCT_ANALYSIS":
      return "Product Analysis Report";
    case "CUSTOMER_INSIGHTS":
      return "Customer Insights Report";
    case "FULL_ANALYSIS":
      return "Complete Store Analysis";
    default:
      return "Report";
  }
}

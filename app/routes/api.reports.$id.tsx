import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { promises as fs } from "fs";
import { ReportService } from "../services/report.service";
import type { ReportStatus as ReportStatusType } from "@prisma/client";

// Import sécurisé de ReportStatus
const ReportStatus = {
  PENDING: "PENDING" as const,
  PROCESSING: "PROCESSING" as const,
  COMPLETED: "COMPLETED" as const,
  COMPLETED_WITH_EMPTY_DATA: "COMPLETED_WITH_EMPTY_DATA" as const,
  ERROR: "ERROR" as const
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const reportId = params.id;

  if (!reportId) {
    throw new Response("Report ID is required", { status: 400 });
  }

  // Find the report
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      shop: {
        include: {
          fiscalConfig: true
        }
      }
    }
  });

  if (!report) {
    throw new Response("Report not found", { status: 404 });
  }

  // Check if report is completed and has a file
  if (report.status !== ReportStatus.COMPLETED && report.status !== ReportStatus.COMPLETED_WITH_EMPTY_DATA) {
    throw new Response("Report is not ready for download", { status: 400 });
  }

  // Générer le rapport à la volée (en mémoire)
  try {
    const reportService = new ReportService(admin);
    if (!report.startDate || !report.endDate) {
      throw new Response("Report dates are missing", { status: 400 });
    }
    // On regénère le contenu à la volée (pas de lecture disque)
    const generated = await reportService.generateAndSaveReport({
      shop: report.shop,
      dataType: report.dataType,
      format: report.format,
      startDate: report.startDate.toISOString(),
      endDate: report.endDate.toISOString(),
      fileName: report.fileName,
      type: report.type as 'manual' | 'scheduled',
    });
    let fileContent = null;
    if (generated.filePath) {
      fileContent = await fs.readFile(generated.filePath);
    } else {
      throw new Response("Report file not generated", { status: 500 });
    }

    // Determine content type based on format
    let contentType = 'application/octet-stream';
    switch (report.format.toLowerCase()) {
      case 'csv':
        contentType = 'text/csv';
        break;
      case 'json':
        contentType = 'application/json';
        break;
      case 'xml':
        contentType = 'application/xml';
        break;
      case 'xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
    }

    // Return the file as a download
    return new Response(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename=\"${report.fileName}\"`,
        "Content-Length": Buffer.byteLength(fileContent).toString(),
      },
    });
  } catch (error) {
    console.error('Error generating report file:', error);
    throw new Response("Failed to generate report file", { status: 500 });
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const reportId = params.id;

  if (!reportId) {
    throw new Response("Report ID is required", { status: 400 });
  }

  if (request.method === "DELETE") {
    try {
      // Find the report first to get the file path
      const report = await prisma.report.findUnique({
        where: { id: reportId }
      });

      if (report && report.filePath) {
        // Try to delete the file
        try {
          await fs.unlink(report.filePath);
        } catch (fileError) {
          console.warn('Could not delete report file:', fileError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete from database
      await prisma.report.delete({
        where: { id: reportId },
      });

      return json({ success: true });
    } catch (error) {
      console.error('Error deleting report:', error);
      return json({ error: "Failed to delete report" }, { status: 500 });
    }
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const action = formData.get("action");

    if (action === "retry") {
      try {
        // Find the report
        const report = await prisma.report.findUnique({
          where: { id: reportId },
          include: {
            shop: {
              include: {
                fiscalConfig: true
              }
            }
          }
        });

        if (!report) {
          return json({ error: "Report not found" }, { status: 404 });
        }

        // Update status to PENDING to trigger regeneration
        await prisma.report.update({
          where: { id: reportId },
          data: {
            status: ReportStatus.PENDING,
            errorMessage: null
          }
        });

        return json({ success: true, message: "Report queued for regeneration" });
      } catch (error) {
        console.error('Error retrying report:', error);
        return json({ error: "Failed to retry report" }, { status: 500 });
      }
    }
  }

  throw new Response("Method not allowed", { status: 405 });
}; 
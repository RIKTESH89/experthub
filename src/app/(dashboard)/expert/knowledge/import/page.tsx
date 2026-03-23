"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlogImportForm } from "@/components/knowledge/blog-import-form";
import { PdfImportForm } from "@/components/knowledge/pdf-import-form";
import { ImportHistoryTable } from "@/components/knowledge/import-history-table";

export default function KnowledgeImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/expert/knowledge"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Knowledge Base
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">
          Import Content
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Import blog articles and PDF documents into your Digital Twin&apos;s knowledge base.
        </p>
      </div>

      <Tabs defaultValue="blog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="blog">Blog Import</TabsTrigger>
          <TabsTrigger value="pdf">PDF Import</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="blog">
          <BlogImportForm />
        </TabsContent>

        <TabsContent value="pdf">
          <PdfImportForm />
        </TabsContent>

        <TabsContent value="history">
          <ImportHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

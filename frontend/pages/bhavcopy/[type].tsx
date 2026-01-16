import { BhavcopyTable } from "@/components/BhavcopyTable";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { bhavcopyCategories, bhavcopyColumns } from "@/lib/bhavcopylist";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";

const Index = () => {
  const router = useRouter();
  const { type } = router.query; // from pages/bhavcopy/[type].tsx

  // Wait for type to be available (Next.js pre-render issue)
  if (!type) return null;
  const typeStr = type as string;

  // Get matching category details
  const category = bhavcopyCategories.find((cat) => cat.id === type);

  // Get columns dynamically
  const columns = bhavcopyColumns[typeStr as keyof typeof bhavcopyColumns] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center space-x-4"> 
            <Link href="/bhavcopy">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Bhavcopy
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {category?.title || "Bhavcopy Data"}
              </h1>
              <p className="text-slate-600">{category?.description}</p>
            </div>
          </div>

          <BhavcopyTable
            dynamicURL={"bhavcopy/"+String(typeStr)}
            title={category?.title || ""}
            description={category?.description || ""}
            columns={columns}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;

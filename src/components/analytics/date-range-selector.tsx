"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DateRangeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        <TabsTrigger value="7d">7 Days</TabsTrigger>
        <TabsTrigger value="30d">30 Days</TabsTrigger>
        <TabsTrigger value="90d">90 Days</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

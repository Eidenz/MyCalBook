import { LucideProps } from 'lucide-react';
import React from 'react';

// This is a workaround for lucide-react not exporting ChevronLeft properly
// or any other icon that might be missing from its types.
declare module "lucide-react" {
    export const ChevronLeft: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
}
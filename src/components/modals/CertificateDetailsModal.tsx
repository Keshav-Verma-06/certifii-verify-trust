import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, XCircle } from "lucide-react";

type CertificateDetailsProps = {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    id: string;
    certificateId: string;
    reason: string;
    institution: string;
    reportCount: number;
    severity: string;
    // Additional details that would be shown in the modal
    issueDetails?: {
      title: string;
      description: string;
      type: "error" | "warning" | "info";
    }[];
  } | null;
  onAddToBlacklist?: () => void;
};

export const CertificateDetailsModal = ({
  isOpen,
  onClose,
  certificate,
  onAddToBlacklist,
}: CertificateDetailsProps) => {
  if (!certificate) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">High Risk</Badge>;
      case "medium":
        return <Badge className="bg-warning/10 text-warning">Medium Risk</Badge>;
      case "low":
        return <Badge variant="secondary">Low Risk</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  // Default issues based on the reason if no specific issues are provided
  const issues = certificate.issueDetails || [
    {
      title: "Certificate Verification Failed",
      description: certificate.reason,
      type: "error" as const,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Certificate Details</DialogTitle>
          <DialogDescription>
            Detailed information about flagged certificate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Certificate ID</p>
              <p className="font-mono text-sm">{certificate.certificateId}</p>
            </div>
            {getSeverityBadge(certificate.severity)}
          </div>

          <div>
            <p className="font-semibold">Institution</p>
            <p className="text-sm">{certificate.institution}</p>
          </div>

          <div>
            <p className="font-semibold">Reports</p>
            <p className="text-sm">{certificate.reportCount} reports filed</p>
          </div>

          <div className="border-t pt-4">
            <p className="font-semibold mb-2">Issues Detected</p>
            <div className="space-y-3">
              {issues.map((issue, index) => (
                <div key={index} className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {getIssueIcon(issue.type)}
                    <p className="font-medium">{issue.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground pl-7">
                    {issue.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            variant="destructive"
            onClick={() => {
              if (onAddToBlacklist) {
                onAddToBlacklist();
                onClose();
              }
            }}
          >
            Add to Blacklist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
import type { AppSummary } from "@kintone-site-discovery/core";

export const mockAppSummaries: AppSummary[] = [
  { id: "101", kintoneAppId: 101, name: "Sales Management", spaceName: "CRM", isGuestSpace: false, hasPlugins: true, hasCustomization: true, captureStatus: "in_snapshot" },
  { id: "102", kintoneAppId: 102, name: "Support Tickets", spaceName: "CRM", isGuestSpace: false, hasPlugins: true, hasCustomization: false, captureStatus: "not_captured" },
  { id: "103", kintoneAppId: 103, name: "Contacts", spaceName: "CRM", isGuestSpace: false, hasPlugins: false, hasCustomization: true, captureStatus: "not_captured" },
  { id: "104", kintoneAppId: 104, name: "Customer Portal Requests", spaceName: "CRM", isGuestSpace: false, hasPlugins: true, hasCustomization: true, captureStatus: "not_captured" },
  { id: "108", kintoneAppId: 108, name: "Projects Tracker", spaceName: "Delivery", isGuestSpace: false, hasPlugins: false, hasCustomization: true, captureStatus: "not_captured" },
  { id: "109", kintoneAppId: 109, name: "Implementation Tasks", spaceName: "Delivery", isGuestSpace: false, hasPlugins: true, hasCustomization: true, captureStatus: "not_captured" },
  { id: "110", kintoneAppId: 110, name: "Release Checklist", spaceName: "Delivery", isGuestSpace: false, hasPlugins: false, hasCustomization: false, captureStatus: "not_captured" },
  { id: "122", kintoneAppId: 122, name: "Support Escalations", spaceName: "Customer Care", isGuestSpace: false, hasPlugins: false, hasCustomization: true, captureStatus: "last_scan_warning" },
  { id: "123", kintoneAppId: 123, name: "Knowledge Base Drafts", spaceName: "Customer Care", isGuestSpace: false, hasPlugins: false, hasCustomization: true, captureStatus: "not_captured" },
  { id: "130", kintoneAppId: 130, name: "Contracts", spaceName: "Legal", isGuestSpace: false, hasPlugins: true, hasCustomization: false, captureStatus: "in_snapshot" },
  { id: "131", kintoneAppId: 131, name: "NDA Tracker", spaceName: "Legal", isGuestSpace: false, hasPlugins: false, hasCustomization: false, captureStatus: "not_captured" },
  { id: "144", kintoneAppId: 144, name: "Vendor Intake", spaceName: "Procurement", isGuestSpace: false, hasPlugins: false, hasCustomization: false, captureStatus: "not_captured" },
  { id: "145", kintoneAppId: 145, name: "Purchase Requests", spaceName: "Procurement", isGuestSpace: false, hasPlugins: true, hasCustomization: false, captureStatus: "not_captured" },
  { id: "146", kintoneAppId: 146, name: "Supplier Audit", spaceName: "Procurement", isGuestSpace: false, hasPlugins: true, hasCustomization: true, captureStatus: "not_captured" },
  { id: "151", kintoneAppId: 151, name: "Invoices", spaceName: "Finance", isGuestSpace: false, hasPlugins: false, hasCustomization: false, captureStatus: "last_scan_warning" },
  { id: "152", kintoneAppId: 152, name: "Payment Schedule", spaceName: "Finance", isGuestSpace: false, hasPlugins: true, hasCustomization: true, captureStatus: "not_captured" },
  { id: "160", kintoneAppId: 160, name: "Employee Directory", spaceName: "HR", isGuestSpace: false, hasPlugins: false, hasCustomization: false, captureStatus: "not_captured" },
  { id: "161", kintoneAppId: 161, name: "Onboarding Requests", spaceName: "HR", isGuestSpace: false, hasPlugins: true, hasCustomization: true, captureStatus: "not_captured" },
  { id: "170", kintoneAppId: 170, name: "Partner Questions", spaceName: "Guest Space: Partners", isGuestSpace: true, hasPlugins: false, hasCustomization: true, captureStatus: "not_captured" },
  { id: "171", kintoneAppId: 171, name: "Partner Deliverables", spaceName: "Guest Space: Partners", isGuestSpace: true, hasPlugins: true, hasCustomization: false, captureStatus: "not_captured" },
  { id: "180", kintoneAppId: 180, name: "System Notices", isGuestSpace: false, hasPlugins: false, hasCustomization: false, captureStatus: "not_captured" },
  { id: "181", kintoneAppId: 181, name: "Internal Lookup Tables", isGuestSpace: false, hasPlugins: false, hasCustomization: true, captureStatus: "not_captured" },
];

export const defaultSelectedAppIds = ["101", "122", "130"];

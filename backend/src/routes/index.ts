import { Router } from "express";
import { adaptRoute } from "./adapter";

// Health & Database
import { GET as healthGet } from "../api/health/route";
import { GET as dbStatusGet } from "../api/database/status/route";

// Donors
import { GET as donorsGet } from "../api/donors/route";
import { POST as donorsRegisterPost } from "../api/donors/register/route";
import { POST as donorsVerifyRequestPost } from "../api/donors/verify/request/route";
import { GET as donorByIdGet, PATCH as donorByIdPatch } from "../api/donors/[id]/route";
import { GET as donorCorrectionsGet, POST as donorCorrectionsPost } from "../api/donors/[id]/corrections/route";
import { POST as donorDonationsPost } from "../api/donors/[id]/donations/route";
import { POST as donorNotifyWhenEligiblePost } from "../api/donors/[id]/notify-when-eligible/route";

// Requests
import { GET as requestsGet, POST as requestsPost } from "../api/requests/route";
import { PATCH as requestStatusPatch } from "../api/requests/[id]/status/route";

// Auth
import { POST as loginPost } from "../api/auth/login/route";
import { POST as logoutPost } from "../api/auth/logout/route";
import { POST as demoSessionPost } from "../api/auth/demo-session/route";
import { POST as otpSendPost } from "../api/auth/otp/send/route";
import { POST as otpVerifyPost } from "../api/auth/otp/verify/route";

// Admin
import { GET as adminAuditLogsGet } from "../api/admin/audit-logs/route";
import { GET as adminCorrectionRequestsGet, POST as adminCorrectionRequestsPost } from "../api/admin/correction-requests/route";
import { POST as adminDonationsVerifyPost } from "../api/admin/donations/verify/route";
import { POST as adminDonorsVerifyPost } from "../api/admin/donors/verify/route";
import { POST as adminOrgVerifyPost } from "../api/admin/organizations/verify/route";
import { GET as adminPoliciesGet, PUT as adminPoliciesPut } from "../api/admin/policies/route";
import { POST as adminReportsResolvePost } from "../api/admin/reports/resolve/route";

// Organizations
import { GET as organizationsGet, POST as organizationsPost } from "../api/organizations/route";

// Reports
import { GET as reportsGet, POST as reportsPost } from "../api/reports/route";

// User & Users
import { POST as userDeletePost } from "../api/user/delete/route";
import { GET as userExportGet } from "../api/user/export/route";
import { GET as userPreferencesGet, POST as userPreferencesPost } from "../api/user/preferences/route";
import { POST as usersBlockPost } from "../api/users/block/route";

// Notifications
import { GET as notificationsGet } from "../api/notifications/route";

export function createApiRouter(): Router {
  const router = Router();

  // 1. Health & Database
  router.get("/health", adaptRoute(healthGet));
  router.get("/database/status", adaptRoute(dbStatusGet));

  // 2. Auth Routes
  router.post("/auth/login", adaptRoute(loginPost));
  router.post("/auth/logout", adaptRoute(logoutPost));
  router.post("/auth/demo-session", adaptRoute(demoSessionPost));
  router.post("/auth/otp/send", adaptRoute(otpSendPost));
  router.post("/auth/otp/verify", adaptRoute(otpVerifyPost));

  // 3. Admin Routes
  router.get("/admin/audit-logs", adaptRoute(adminAuditLogsGet));
  router.get("/admin/correction-requests", adaptRoute(adminCorrectionRequestsGet));
  router.post("/admin/correction-requests", adaptRoute(adminCorrectionRequestsPost));
  router.post("/admin/donations/verify", adaptRoute(adminDonationsVerifyPost));
  router.post("/admin/donors/verify", adaptRoute(adminDonorsVerifyPost));
  router.post("/admin/organizations/verify", adaptRoute(adminOrgVerifyPost));
  router.get("/admin/policies", adaptRoute(adminPoliciesGet));
  router.put("/admin/policies", adaptRoute(adminPoliciesPut));
  router.post("/admin/reports/resolve", adaptRoute(adminReportsResolvePost));

  // 4. Donors Routes (Order matters: specific routes before :id)
  router.get("/donors", adaptRoute(donorsGet));
  router.post("/donors/register", adaptRoute(donorsRegisterPost));
  router.post("/donors/verify/request", adaptRoute(donorsVerifyRequestPost));
  router.get("/donors/:id/corrections", adaptRoute(donorCorrectionsGet));
  router.post("/donors/:id/corrections", adaptRoute(donorCorrectionsPost));
  router.post("/donors/:id/donations", adaptRoute(donorDonationsPost));
  router.post("/donors/:id/notify-when-eligible", adaptRoute(donorNotifyWhenEligiblePost));
  router.get("/donors/:id", adaptRoute(donorByIdGet));
  router.patch("/donors/:id", adaptRoute(donorByIdPatch));

  // 5. Requests Routes
  router.get("/requests", adaptRoute(requestsGet));
  router.post("/requests", adaptRoute(requestsPost));
  router.patch("/requests/:id/status", adaptRoute(requestStatusPatch));

  // 6. Organizations Routes
  router.get("/organizations", adaptRoute(organizationsGet));
  router.post("/organizations", adaptRoute(organizationsPost));

  // 7. Reports Routes
  router.get("/reports", adaptRoute(reportsGet));
  router.post("/reports", adaptRoute(reportsPost));

  // 8. User Routes
  router.post("/user/delete", adaptRoute(userDeletePost));
  router.get("/user/export", adaptRoute(userExportGet));
  router.get("/user/preferences", adaptRoute(userPreferencesGet));
  router.post("/user/preferences", adaptRoute(userPreferencesPost));
  router.post("/users/block", adaptRoute(usersBlockPost));

  // 9. Notifications Routes
  router.get("/notifications", adaptRoute(notificationsGet));

  return router;
}

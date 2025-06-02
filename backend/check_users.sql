SELECT u.id, u."firstName", u."lastName", u.role, pm."projectId", pm.allocation 
FROM "User" u 
LEFT JOIN "ProjectMembership" pm ON u.id = pm."userId" 
ORDER BY u."firstName";

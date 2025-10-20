# Week 2 Deployment Commands

## Local Testing
```powershell
# Navigate to client dashboard
cd "c:\Users\Drood\Desktop\Blunari SAAS\apps\client-dashboard"

# Start dev server
npm run dev

# Open browser to http://localhost:5173/catering
# Verify:
# - Animated counters in metric cards
# - Sparklines showing 30-day trends
# - Smooth spring animations
# - Mobile responsive
```

## Production Deployment
```powershell
# Navigate to root
cd "c:\Users\Drood\Desktop\Blunari SAAS"

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat(catering): Week 2 - animated counters and sparklines

- Add Sparkline component for mini trend visualizations
- Add AnimatedCounter with spring physics
- Integrate sparklines into all 4 metric cards
- Add animated counters with currency/number formatting
- Color-code sparklines (success/warning/destructive)
- Install Recharts and Framer Motion dependencies

Week 2 of Phase 1 Foundation complete (80/520 hours, 15.4%)
Closes Week 2 implementation"

# Push to trigger Vercel auto-deploy
git push origin master
```

## Post-Deployment Verification

### 1. Monitor Vercel Deployment
Visit: https://vercel.com/deewav3s-projects/client-dashboard/deployments

Expected deploy time: 2-4 minutes

### 2. Test Production
Visit: https://app.blunari.ai/catering

Checklist:
- [ ] Page loads without console errors
- [ ] Metric numbers animate smoothly on load
- [ ] Sparklines render in all 4 cards
- [ ] AnimatedCounter shows currency with 2 decimals
- [ ] Spring physics feel natural (not too bouncy)
- [ ] Mobile responsive (test on phone)
- [ ] Dark mode works (sparklines visible)
- [ ] Loading states work (throttle network)

### 3. Performance Check
- Open DevTools → Performance tab
- Record page load
- Check:
  - Time to Interactive < 2s
  - No layout shifts during animations
  - Frame rate stays 60fps

### 4. Bundle Size Verification
```powershell
cd apps/client-dashboard
npm run build

# Check dist/assets/*.js file sizes
# Expected increase: ~150KB for Recharts + Framer Motion
```

## Rollback Plan (if needed)

```powershell
# If issues found in production, rollback to previous commit
git log --oneline -5  # Find commit hash before Week 2

git revert <commit-hash>  # Create revert commit

git push origin master  # Trigger redeploy
```

## Next Session Prep (Week 3-4)

### Install Dependencies for Kanban Board
```powershell
cd apps/client-dashboard

npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Study Resources
- @dnd-kit documentation: https://docs.dndkit.com/
- Kanban board examples: https://docs.dndkit.com/presets/sortable/kanban
- Accessibility: https://docs.dndkit.com/api-documentation/accessibility

---

**Current Status**: Ready for Week 2 deployment  
**Next Milestone**: Week 3-4 Kanban Board (32 hours)  
**Overall Progress**: 80/520 hours (15.4%)

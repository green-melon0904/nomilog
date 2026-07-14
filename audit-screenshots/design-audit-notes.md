# のみログ Web Design Audit

Date: 2026-07-05

## Scope

- Home, search, product detail, review form, and desktop-width home.
- Evidence: screenshots captured from `http://localhost:3007`.
- Comparison context: Tabelog, Yelp, Untappd public web surfaces checked on 2026-07-05.

## Screenshots

1. `01-home-mobile.png` - Mobile home first viewport
2. `02-search-mobile.png` - Mobile search/results
3. `03-product-detail-mobile.png` - Mobile product detail first viewport
4. `04-product-detail-cta-mobile.png` - Product detail CTA and reviews
5. `05-review-form-mobile.png` - Mobile review form
6. `06-home-desktop.png` - Desktop-width home

## Summary Rating

Overall: 7/10.

The design is clean, consistent, and stronger than a typical MVP. It has a clear mobile app posture, coherent tokens, strong card rhythm, and a useful product-detail model for drinks. The main gap is distinctiveness and conversion focus: compared with mature review products, the app is pleasant but still quiet about why users should trust it, post reviews, and return.

## Strengths

- Consistent mobile-first system: 480px max-width, fixed bottom navigation, 8px radius, repeated cards, and a clear blue accent make the app feel coherent.
- Good information hierarchy on product detail: image, rating, review count, taste axes, places to buy, CTA, and reviews are ordered naturally.
- Search and product cards are scannable: product image, name, maker/category, stars, and review count are readable at mobile size.
- Review form uses large tap targets and segmented choices that fit mobile input better than long select menus.
- Empty state exists for missing search results, which is better than many MVPs.

## UX Risks

- The home screen lacks an introductory value proposition. Search starts immediately, but first-time users may not know whether this is for discovering drinks, logging drinks, comparing tastes, or finding purchase locations.
- Category chips horizontally overflow with no label or affordance beyond clipping. It works, but feels cramped.
- Search filters require a separate `反映` button even though most mobile filter chips feel expected to update immediately.
- Product detail CTA is below the first viewport. If review creation is a primary growth loop, `レビューを書く` should be easier to reach.
- Review form is long and the sticky submit button visually overlaps the active field area. It creates pressure before the user understands all required fields.
- Desktop view is essentially a centered mobile app with large white margins. This is acceptable if the product is mobile-only, but weak if positioned as a web product.

## Visual Design Risks

- The product SVG illustrations are clear but feel placeholder-like compared with photo-rich review sites. Tabelog and Yelp lean on real user/business photos, while Untappd uses polished app screenshots and drink imagery.
- IBM Plex Sans JP semibold everywhere gives a strong brand feel, but also makes secondary text feel heavier than needed. A 400/500/600 type scale would improve depth.
- Brand blue `#2A9BE1` has about 3.05:1 contrast against white. It is fine for larger UI accents but risky for small text and white-on-blue button labels below WCAG AA normal-text contrast.
- The design is very clean but somewhat generic. The drink-specific differentiators, such as sweetness, carbonation, scene, and buyable places, could be more visually prominent.

## Accessibility Risks

- Several custom segmented controls communicate state visually but do not expose `aria-pressed` or radio-group semantics.
- Text inputs and textareas remove outlines and rely on custom focus only in some places; focus-visible states should be standardized across links, buttons, chips, selects, and cards.
- Disabled-looking submit state is not actually disabled in the form markup, so the visual state and interaction model may conflict.
- Star controls have labels, which is good, but the rating group could benefit from a grouped label and selected-state announcement.
- Screenshot-only review cannot confirm screen reader order, keyboard completion, or full WCAG compliance.

## Comparison Notes

- Tabelog: much denser and search-heavy, with strong location/date/people search and large area lists. Nomilog is cleaner and less overwhelming, but has less trust/content density.
- Yelp: clearer global purpose and category browse model, with explicit `Write a Review` and major category entry points. Nomilog is simpler, but its primary action is less visible.
- Untappd: closest conceptual reference. Untappd frames the value as a drink journal, recommendations, badges, nearby places, and live menus. Nomilog already has taste axes and review logging, but does not yet package them as a strong product story.

## Recommendations

1. Add a compact home intro under the header: one line such as `飲んだ一本を記録して、味・買える場所で探す` plus primary actions for `探す` and `レビューを書く`.
2. Make the drink-specific data the visual signature: sweetness, carbonation, cost performance, scene tags, and buyable locations should be more prominent than generic stars alone.
3. Move or duplicate `レビューを書く` into a sticky detail footer or header action on product detail.
4. Replace the search `反映` button with immediate filter updates, or visually group it as an advanced filter apply action.
5. Reduce secondary copy weight from 600 to 400/500 and reserve 600 for headings, buttons, and key numbers.
6. Use `#116CA8` or a darker blue for small text and button labels, keeping `#2A9BE1` as brand fill/decoration.
7. Add visible focus states and ARIA selected/pressed semantics to chips, number buttons, and rating controls.
8. Decide the desktop strategy: either embrace mobile-only with an app-store/QR landing shell, or create a wider two-column desktop layout.

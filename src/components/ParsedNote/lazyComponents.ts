/**
 * Lazy loading helpers for ParsedNote components
 * These heavy components are only loaded when actually needed in note content
 */

import { lazy } from 'solid-js';

// Lazy load embedded note component (~100KB)
export const EmbeddedNote = lazy(() => import('../EmbeddedNote/EmbeddedNote'));

// Lazy load article preview components
export const ArticleCompactPreview = lazy(() => import('../ArticlePreview/ArticleCompactPreview'));
export const SimpleArticlePreview = lazy(() => import('../ArticlePreview/SimpleArticlePreview'));

// Lazy load link preview
export const LinkPreview = lazy(() => import('../LinkPreview/LinkPreview'));

// Lazy load live event previews
export const LiveEventPreview = lazy(() => import('../LiveVideo/LiveEventPreview'));
export const ExternalLiveEventPreview = lazy(() => import('../LiveVideo/ExternalLiveEventPreview'));

// Lazy load profile note zap
export const ProfileNoteZap = lazy(() => import('../ProfileNoteZap/ProfileNoteZap'));

// Lazy load Nostr image
export const NostrImage = lazy(() => import('../NostrImage/NostrImage'));

// Lazy load Lnbc component
export const Lnbc = lazy(() => import('../Lnbc/Lnbc'));

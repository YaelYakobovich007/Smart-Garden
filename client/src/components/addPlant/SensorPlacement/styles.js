import { StyleSheet } from 'react-native';

/** ===== Theme ===== */
const APP_BG = "#EAF7EF";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#243B41";
const SUBTEXT = "#6C7A80";
const ACCENT = "#42D39B";

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: APP_BG 
  },
  screen: {
    flex: 1,
    backgroundColor: APP_BG,
    padding: 16,
    gap: 12,
  },
  screenTitle: {
    color: TEXT_DARK,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },

  /** Stepper */
  stepperRow: {
    marginTop: 6,
    marginBottom: 6,
    alignSelf: "center",
    width: "56%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5 
  },
  stepDotActive: { 
    backgroundColor: ACCENT 
  },
  stepDotInactive: { 
    backgroundColor: "#C9D6D0" 
  },
  stepLine: { 
    height: 2, 
    flex: 1, 
    marginHorizontal: 8, 
    borderRadius: 1 
  },
  stepLineActive: { 
    backgroundColor: ACCENT 
  },
  stepLineInactive: { 
    backgroundColor: "#C9D6D0" 
  },

  /** Card */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    color: TEXT_DARK,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  cardSubtitle: {
    color: SUBTEXT,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },

  /** Animation stage */
  stage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 0,
    position: "relative",
    overflow: "hidden",
  },

  /** Badge */
  badge: {
    position: "absolute",
    top: -8,
    right: -30,
    backgroundColor: "#3A86FF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: "#EEF5FF",
  },
  badgeText: { 
    color: "#EEF5FF", 
    fontWeight: "800", 
    fontSize: 12 
  },

  /** Instructions + CTA */
  instructions: { 
    color: "#5B6D73", 
    fontSize: 14, 
    lineHeight: 20, 
    marginBottom: 6 
  },
  cta: {
    marginTop: 10,
    width: "100%",
    paddingVertical: 14,
    backgroundColor: ACCENT,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { 
    color: "#0B132B", 
    fontWeight: "800", 
    fontSize: 16 
  },
});

export default styles;

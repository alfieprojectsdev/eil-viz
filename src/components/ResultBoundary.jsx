import { Component } from "react";
import { AssessmentError } from "../lib/api";
import ErrorScreen from "./ErrorScreen";

// A response the dashboard can't draw (a malformed _viz_grid, say) must not
// blank the page or leave half a verdict on screen. It fails closed onto the
// error screen instead.
export default class ResultBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(err) {
    return {
      error: new AssessmentError("display", err.message),
    };
  }

  componentDidCatch(err, info) {
    console.error("Result rendering failed", err, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorScreen error={this.state.error} onEdit={this.props.onNewAssessment} />;
    }
    return this.props.children;
  }
}

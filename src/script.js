import { list } from "./data.js";
import { CONFIG } from "./config.js";
import Viva from "vivagraphjs";

/**
 * Main application class for theorem graph visualization
 */
class TheoremGraphApp {
  constructor() {
    this.graph = Viva.Graph.graph();
    this.fuse = null;
    this.elements = {};
    this.queryString = null;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.font = `${CONFIG.TEXT_SIZE}px`;
  }

  /**
   * Initialize the application
   */
  async init() {
    this.cacheElements();
    this.setupSearch();
    this.setupSubgraphToggle();
    this.queryString = this.getQueryFromURL();
    await this.buildGraph();
  }

  /**
   * Cache DOM elements for reuse
   */
  cacheElements() {
    this.elements = {
      search: document.querySelector(".search"),
      result: document.querySelector(".result"),
      loading: document.getElementById("loading"),
      subgraphCheckbox: document.getElementById("subgraph"),
      graphDiv: document.getElementById("graphDiv"),
    };
  }

  /**
   * Get query string from URL parameters
   */
  getQueryFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("query");
  }

  /**
   * Setup search functionality with Fuse.js
   */
  setupSearch() {
    // Initialize Fuse for fuzzy search
    this.fuse = new Fuse(list, CONFIG.FUSE_OPTIONS);
    
    // Bind search event
    this.elements.search.addEventListener("input", () => this.performSearch());
    this.performSearch();
  }

  /**
   * Setup subgraph checkbox toggle
   */
  setupSubgraphToggle() {
    this.elements.subgraphCheckbox.addEventListener("change", async () => {
      // Clear the existing graph
      this.clearGraph();
      
      // Rebuild with new subgraph setting
      await this.buildGraph();
    });
  }

  /**
   * Clear the graph and container
   */
  clearGraph() {
    // Clear the graph
    this.graph.clear();
    
    // Clear the container
    this.elements.graphDiv.innerHTML = "";
    
    // Recreate the graph instance
    this.graph = Viva.Graph.graph();
  }

  /**
   * Perform search and display results
   */
  performSearch() {
    const searchValue = this.elements.search.value;
    const results = this.fuse.search(searchValue);
    
    const resultHTML = results
      .map((index) => {
        const theorem = list[index];
        const queryString = theorem.replace(/\s+/g, "+");
        return `<li class="search-item">
          <a href="?query=${queryString}">${theorem}</a>
        </li>`;
      })
      .join("");
    
    this.elements.result.innerHTML = resultHTML;
  }

  /**
   * Build the theorem relationship graph
   */
  async buildGraph() {
    try {
      await this.fetchAndRenderGraph();
    } catch (error) {
      console.error("Error building graph:", error);
      this.showError(CONFIG.MESSAGES.ERROR_FETCH);
    }
  }

  /**
   * Fetch Wikipedia data and render the graph
   */
  async fetchAndRenderGraph() {
    if (!this.queryString) {
      this.showEmptyState(CONFIG.MESSAGES.EMPTY_SEARCH);
      return;
    }

    this.showLoading(true);

    try {
      const relationships = await this.fetchWikiRelationships(this.queryString);
      
      if (relationships.length === 0) {
        this.showEmptyState(CONFIG.MESSAGES.NO_RESULTS);
        return;
      }

      this.renderGraph(relationships);
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Fetch theorem relationships from Wikipedia API
   */
  async fetchWikiRelationships(pageName) {
    const mainLinks = await this.fetchPageLinks(pageName);
    
    if (!this.elements.subgraphCheckbox.checked) {
      return [mainLinks];
    }

    // Fetch sub-relationships for each main link
    const subRelationships = await Promise.all(
      mainLinks.map((link) => this.fetchSubRelationships(link, pageName))
    );

    return subRelationships;
  }

  /**
   * Fetch links from a Wikipedia page
   */
  async fetchPageLinks(pageName, includeExtended = false) {
    const url = `${CONFIG.WIKI_API_BASE}?${CONFIG.WIKI_API_PARAMS}&page=${pageName}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.parse || !data.parse.links) {
        return [];
      }

      return this.filterLinks(data.parse.links, pageName, includeExtended);
    } catch (error) {
      console.error(`Error fetching links for ${pageName}:`, error);
      return [];
    }
  }

  /**
   * Filter Wikipedia links based on relevance
   */
  filterLinks(links, excludePage, includeExtended = false) {
    const matchRegex = includeExtended 
      ? CONFIG.REGEX.EXTENDED_MATCH 
      : CONFIG.REGEX.THEOREM_MATCH;
    
    const excludeRegex = includeExtended 
      ? CONFIG.REGEX.EXCLUDE_EXTENDED 
      : CONFIG.REGEX.EXCLUDE_COMMON;
    
    const excludePageRegex = new RegExp(excludePage, "i");

    return links
      .map((link) => link["*"])
      .filter((linkText) => {
        return (
          matchRegex.test(linkText) &&
          !excludePageRegex.test(linkText) &&
          !excludeRegex.test(linkText)
        );
      });
  }

  /**
   * Fetch sub-relationships for a given theorem
   */
  async fetchSubRelationships(theoremName, parentPage) {
    const subLinks = await this.fetchPageLinks(theoremName, true);
    
    // Filter out the parent page from sub-links
    const filteredSubLinks = subLinks.filter((link) => {
      const excludeRegex = new RegExp(`${theoremName}|${parentPage}`, "i");
      return !excludeRegex.test(link);
    });

    return [theoremName, ...filteredSubLinks];
  }

  /**
   * Render the graph with relationships
   */
  renderGraph(relationships) {
    // Add parent node
    this.addNode("parent", this.queryString, CONFIG.NODE_STYLES.PRIMARY);

    if (this.elements.subgraphCheckbox.checked) {
      this.renderSubgraphMode(relationships);
    } else {
      this.renderSimpleMode(relationships[0]);
    }

    this.initializeRenderer();
  }

  /**
   * Render graph in subgraph mode (with nested relationships)
   */
  renderSubgraphMode(relationships) {
    relationships.forEach((branch) => {
      if (branch.length === 0) return;

      const mainNode = branch[0];
      
      // Add main branch node
      this.addNode(mainNode, mainNode, CONFIG.NODE_STYLES.PRIMARY);
      this.addLink("parent", mainNode, "red-stroke");

      // Add sub-nodes
      for (let i = 1; i < branch.length; i++) {
        this.addNode(branch[i], branch[i], CONFIG.NODE_STYLES.SECONDARY);
        this.addLink(mainNode, branch[i], "gray");
      }
    });
  }

  /**
   * Render graph in simple mode (single level)
   */
  renderSimpleMode(mainLinks) {
    mainLinks.forEach((link) => {
      this.addNode(link, link, CONFIG.NODE_STYLES.PRIMARY);
      this.addLink("parent", link, "red-stroke");
    });
  }

  /**
   * Add a node to the graph
   */
  addNode(id, text, style) {
    this.graph.addNode(id, {
      text,
      cn: style.color,
      strokeClass: style.strokeClass,
    });
  }

  /**
   * Add a link between nodes
   */
  addLink(fromId, toId, className) {
    this.graph.addLink(fromId, toId, { cn: className });
  }

  /**
   * Initialize and run the graph renderer
   */
  initializeRenderer() {
    const graphics = this.createGraphics();
    const layout = this.createLayout();

    const renderer = Viva.Graph.View.renderer(this.graph, {
      graphics,
      container: this.elements.graphDiv,
      layout,
    });

    renderer.run();
  }

  /**
   * Create custom graphics for nodes and links
   */
  createGraphics() {
    const graphics = Viva.Graph.View.svgGraphics();
    const ctx = this.ctx;

    graphics
      .node((node) => {
        const textWidth = ctx.measureText(node.data.text).width;
        const g = Viva.Graph.svg("g");

        // Add background rectangle
        g.append("rect")
          .attr("width", textWidth * CONFIG.NODE_WIDTH_MULTIPLIER)
          .attr("height", CONFIG.NODE_HEIGHT)
          .attr("class", `bbox ${node.data.strokeClass}`)
          .attr("y", -30)
          .attr("x", -10);

        // Add text label
        g.append("text")
          .attr("class", `dataText ${node.data.cn}`)
          .text(node.data.text);

        return g;
      })
      .placeNode((nodeUI, pos) => {
        nodeUI.attr("transform", `translate(${pos.x}, ${pos.y})`);
      });

    graphics
      .link((link) => {
        return Viva.Graph.svg("path")
          .attr("stroke", "gray")
          .attr("stroke-width", "3")
          .attr("class", link.data.cn);
      })
      .placeLink((linkUI, fromPos, toPos) => {
        const pathData = `M${fromPos.x},${fromPos.y}L${toPos.x},${toPos.y}`;
        linkUI.attr("d", pathData);
      });

    return graphics;
  }

  /**
   * Create force-directed layout for the graph
   */
  createLayout() {
    const nodeCount = this.graph.getNodesCount();
    const springLength =
      nodeCount > CONFIG.GRAPH_SPRING_LENGTH.THRESHOLD
        ? CONFIG.GRAPH_SPRING_LENGTH.EXTENDED
        : CONFIG.GRAPH_SPRING_LENGTH.DEFAULT;

    return Viva.Graph.Layout.forceDirected(this.graph, {
      springLength,
      ...CONFIG.GRAPH_LAYOUT,
    });
  }

  /**
   * Show or hide loading indicator
   */
  showLoading(show) {
    this.elements.loading.innerHTML = show ? CONFIG.MESSAGES.LOADING : "";
  }

  /**
   * Display empty state message
   */
  showEmptyState(message) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "empty-container";
    emptyDiv.textContent = message;
    this.elements.graphDiv.appendChild(emptyDiv);
  }

  /**
   * Display error message
   */
  showError(message) {
    this.showLoading(false);
    this.showEmptyState(message);
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new TheoremGraphApp();
  app.init();
});

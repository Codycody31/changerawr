"use strict";var ChangerawrWidgetLoader=(()=>{var s=class{constructor(e,t){let a=this.getScriptOptions();this.container=e,this.options={theme:"light",maxHeight:"400px",position:"bottom-right",isPopup:!1,maxEntries:3,hidden:!1,...a,...t},this.isOpen=!1,this.isLoading=!1,this.init()}getScriptOptions(){let e=document.currentScript;return e?{theme:e.getAttribute("data-theme"),position:e.getAttribute("data-position"),maxHeight:e.getAttribute("data-max-height"),isPopup:e.getAttribute("data-popup")==="true",trigger:e.getAttribute("data-trigger"),maxEntries:e.getAttribute("data-max-entries")?parseInt(e.getAttribute("data-max-entries"),10):void 0,hidden:e.getAttribute("data-popup")==="true"}:{}}addStyles(){let e=`
            .changerawr-widget {
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 14px;
                line-height: 1.5;
                color: #1a1a1a;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                width: 300px;
                overflow: hidden;
                opacity: 1;
                transform: translateY(0);
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            
            .changerawr-widget.popup {
                position: fixed;
                z-index: 9999;
                opacity: 0;
                transform: translateY(20px);
                pointer-events: none;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }

            .changerawr-widget.popup.open {
                opacity: 1;
                transform: translateY(0);
                pointer-events: all;
            }

            .changerawr-widget.hidden {
                display: none;
            }

            .changerawr-widget.dark {
                color: #ffffff;
                background: #1a1a1a;
            }

            .changerawr-header {
                padding: 12px 16px;
                border-bottom: 1px solid #eaeaea;
                font-weight: 600;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .changerawr-close {
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: inherit;
                opacity: 0.6;
                transition: opacity 0.2s;
            }

            .changerawr-close:hover {
                opacity: 1;
            }

            .changerawr-close:focus {
                outline: 2px solid #0066ff;
                border-radius: 4px;
            }

            .dark .changerawr-header {
                border-color: #333;
            }

            .changerawr-entries {
                max-height: var(--max-height, 400px);
                overflow-y: auto;
                padding: 8px 0;
            }

            .changerawr-entry {
                padding: 8px 16px;
                border-bottom: 1px solid #f5f5f5;
                opacity: 0;
                transform: translateY(10px);
                animation: slideIn 0.3s ease forwards;
            }

            .changerawr-entry:nth-child(2) {
                animation-delay: 0.1s;
            }

            .changerawr-entry:nth-child(3) {
                animation-delay: 0.2s;
            }

            @keyframes slideIn {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .dark .changerawr-entry {
                border-color: #333;
            }

            .changerawr-entry:last-child {
                border: none;
            }

            .changerawr-entry:focus-within {
                background: #f5f5f5;
            }

            .dark .changerawr-entry:focus-within {
                background: #333;
            }

            .changerawr-tag {
                display: inline-block;
                padding: 2px 8px;
                background: #e8f2ff;
                color: #0066ff;
                border-radius: 4px;
                font-size: 12px;
                margin-bottom: 4px;
            }

            .dark .changerawr-tag {
                background: #1a365d;
                color: #60a5fa;
            }

            .changerawr-entry-title {
                font-weight: 500;
                margin-bottom: 4px;
            }

            .changerawr-entry-content {
                color: #666;
                font-size: 13px;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 8px;
            }

            .dark .changerawr-entry-content {
                color: #999;
            }

            .changerawr-read-more {
                color: #0066ff;
                text-decoration: none;
                font-size: 12px;
                display: inline-block;
                margin-top: 4px;
                padding: 2px;
            }

            .changerawr-read-more:focus {
                outline: 2px solid #0066ff;
                border-radius: 4px;
            }

            .dark .changerawr-read-more {
                color: #60a5fa;
            }

            .changerawr-read-more:hover {
                text-decoration: underline;
            }

            .changerawr-loading {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100px;
            }

            .changerawr-spinner {
                width: 24px;
                height: 24px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #0066ff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .dark .changerawr-spinner {
                border-color: #333;
                border-top-color: #60a5fa;
            }

            .changerawr-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.3);
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: none;
                z-index: 9998;
            }

            .changerawr-overlay.open {
                opacity: 1;
                pointer-events: all;
            }

            .changerawr-footer {
                padding: 8px 16px;
                border-top: 1px solid #eaeaea;
                font-size: 12px;
                color: #666;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .dark .changerawr-footer {
                border-color: #333;
                color: #999;
            }

            .changerawr-footer a {
                color: inherit;
                text-decoration: none;
            }

            .changerawr-footer a:hover {
                text-decoration: underline;
            }

            /* Position classes */
            .changerawr-widget.popup.bottom-right {
                bottom: 20px;
                right: 20px;
            }

            .changerawr-widget.popup.bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .changerawr-widget.popup.top-right {
                top: 20px;
                right: 20px;
            }

            .changerawr-widget.popup.top-left {
                top: 20px;
                left: 20px;
            }
        `,t=document.createElement("style");t.textContent=e,document.head.appendChild(t)}async init(){this.addStyles(),this.options.isPopup&&(this.container.classList.add("popup",this.options.position),this.setupOverlay()),this.container.className=`changerawr-widget ${this.options.theme}`,this.options.hidden&&this.container.classList.add("hidden"),this.container.style.setProperty("--max-height",this.options.maxHeight),this.container.setAttribute("role","dialog"),this.container.setAttribute("aria-label","Changelog updates"),this.render(),await this.loadEntries(),this.setupKeyboardNavigation(),this.options.trigger&&this.setupTriggerButton()}setupOverlay(){this.overlay=document.createElement("div"),this.overlay.className="changerawr-overlay",document.body.appendChild(this.overlay),this.overlay.addEventListener("click",()=>this.close())}setupKeyboardNavigation(){this.container.addEventListener("keydown",e=>{if(e.key==="Escape"&&this.isOpen&&this.close(),e.key==="Tab"){let t=this.container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),a=t[0],r=t[t.length-1];e.shiftKey&&document.activeElement===a?(e.preventDefault(),r.focus()):!e.shiftKey&&document.activeElement===r&&(e.preventDefault(),a.focus())}})}setupTriggerButton(){let e=document.getElementById(this.options.trigger);if(!e){console.warn(`Changerawr: Trigger button with ID '${this.options.trigger}' not found`);return}e.setAttribute("aria-expanded","false"),e.setAttribute("aria-haspopup","dialog"),e.setAttribute("aria-controls",this.container.id),e.addEventListener("click",()=>{this.toggle(),e.setAttribute("aria-expanded",this.isOpen.toString())}),e.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),this.toggle(),e.setAttribute("aria-expanded",this.isOpen.toString()))})}render(){let e=document.createElement("div");e.className="changerawr-header",e.innerHTML=`
            <span>Latest Updates</span>
            ${this.options.isPopup?`
                <button 
                    class="changerawr-close" 
                    aria-label="Close changelog"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path 
                            fill="currentColor" 
                            d="M8 6.586L4.707 3.293 3.293 4.707 6.586 8l-3.293 3.293 1.414 1.414L8 9.414l3.293 3.293 1.414-1.414L9.414 8l3.293-3.293-1.414-1.414L8 6.586z"
                        />
                    </svg>
                </button>
            `:""}
        `,this.container.appendChild(e);let t=document.createElement("div");t.className="changerawr-entries",t.setAttribute("role","list"),this.container.appendChild(t);let a=document.createElement("div");a.className="changerawr-footer",a.innerHTML=`
            <span>Powered by Changerawr</span>
            <a href="http://localhost:3000/changelog/${this.options.projectId}/rss.xml" target="_blank" rel="noopener noreferrer">RSS</a>
        `,this.container.appendChild(a),this.renderLoading();let r=this.container.querySelector(".changerawr-close");r&&r.addEventListener("click",()=>this.close())}renderLoading(){let e=this.container.querySelector(".changerawr-entries");e.innerHTML=`
            <div class="changerawr-loading">
                <div class="changerawr-spinner" role="status"></div>
            </div>
        `}async loadEntries(){this.isLoading=!0;try{let e=await fetch(`http://localhost:3000/api/changelog/${this.options.projectId}/entries`);if(!e.ok)throw new Error("Failed to fetch entries");let t=await e.json();this.renderEntries(t.items)}catch(e){console.error("Failed to load changelog:",e),this.renderError()}finally{this.isLoading=!1}}renderEntries(e){let t=this.container.querySelector(".changerawr-entries");t.innerHTML="",e.slice(0,this.options.maxEntries).forEach(r=>{var h;let i=document.createElement("div");if(i.className="changerawr-entry",i.setAttribute("role","listitem"),i.setAttribute("tabindex","0"),(h=r.tags)!=null&&h.length){let p=document.createElement("div");p.className="changerawr-tag",p.textContent=r.tags[0].name,i.appendChild(p)}let d=document.createElement("div");d.className="changerawr-entry-title",d.textContent=r.title,i.appendChild(d);let c=document.createElement("div");c.className="changerawr-entry-content",c.textContent=r.content,i.appendChild(c);let o=document.createElement("a");o.href=`http://localhost:3000/changelog/${this.options.projectId}#${r.id}`,o.className="changerawr-read-more",o.textContent="Read more",o.target="_blank",o.setAttribute("aria-label",`Read more about ${r.title}`),i.appendChild(o),t.appendChild(i)})}renderError(){let e=this.container.querySelector(".changerawr-entries");e.innerHTML=`
            <div class="changerawr-error">
                Failed to load changelog entries
                <br>
                <button class="changerawr-retry">
                    Try Again
                </button>
            </div>
        `,e.querySelector(".changerawr-retry").addEventListener("click",()=>this.loadEntries())}open(){if(!this.options.isPopup)return;this.isOpen=!0,this.container.classList.remove("hidden"),this.container.style.display="block",requestAnimationFrame(()=>{this.container.classList.add("open")}),this.previouslyFocused=document.activeElement;let e=this.container.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');e&&e.focus()}close(){if(!this.options.isPopup)return;this.isOpen=!1,this.container.classList.remove("open");let e=()=>{this.isOpen||(this.options.hidden&&this.container.classList.add("hidden"),this.container.style.display="none"),this.container.removeEventListener("transitionend",e)};this.container.addEventListener("transitionend",e),this.previouslyFocused&&this.previouslyFocused.focus()}toggle(){this.isOpen?this.close():this.open()}};document.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll('script[src*="/api/integrations/widget/"]').forEach(e=>{let t=e.getAttribute("src").match(/\/api\/widget\/([^?]+)/);if(!t)return;let a=t[1],r=document.createElement("div");r.id=`changerawr-widget-${Math.random().toString(36).substr(2,9)}`,document.body.appendChild(r);let i=new s(r,{projectId:a,theme:e.getAttribute("data-theme")||"light",position:e.getAttribute("data-position")||"bottom-right",isPopup:e.getAttribute("data-popup")==="true",trigger:e.getAttribute("data-trigger"),maxEntries:e.getAttribute("data-max-entries")?parseInt(e.getAttribute("data-max-entries"),10):3,hidden:e.getAttribute("data-popup")==="true"})})});window.ChangerawrWidget={init:n=>{if(!n.container)throw new Error("Container element is required");if(!n.projectId)throw new Error("Project ID is required");return n.container.id=n.container.id||`changerawr-widget-${Math.random().toString(36).substr(2,9)}`,new s(n.container,{projectId:n.projectId,theme:n.theme||"light",maxHeight:n.maxHeight||"400px",position:n.position||"bottom-right",isPopup:n.isPopup||!1,maxEntries:n.maxEntries||3,hidden:n.hidden||!1,trigger:n.trigger})}};})();
//# sourceMappingURL=widget-bundle.js.map

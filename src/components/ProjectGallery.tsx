"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";

type Project = {
  slug: string;
  title: string;
  image: string;
  alt: string;
  summary: string;
};
export default function ProjectGallery({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState(0);
  if (!projects.length) return null;
  const activeIndex = Math.min(active, projects.length - 1);
  const change = (direction: number) =>
    setActive(
      (value) => (value + direction + projects.length) % projects.length,
    );
  return (
    <div className="project-showcase">
      <div className="project-panels">
        {projects.map((project, index) => (
          <Link
            key={project.slug}
            href={`/projeler/${project.slug}`}
            className={`project-panel ${activeIndex === index ? "is-active" : ""}`}
            aria-label={`${project.title} projesini keşfedin`}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setActive(index);
            }}
            onFocus={() => setActive(index)}
          >
            <Image
              src={project.image}
              alt={project.alt}
              fill
              sizes="(max-width: 700px) 100vw, 65vw"
            />
            <div className="panel-shade" />
            <span
              className="panel-trigger"
              aria-hidden={activeIndex === index}
            >
              <span>{project.title}</span>
            </span>
            <div
              className="panel-copy"
              id={`panel-${project.slug}`}
              hidden={activeIndex !== index}
            >
              <div>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
              </div>
              <span className="circle-arrow" aria-hidden="true">
                <ArrowUpRight size={27} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="showcase-controls">
        <span aria-live="polite" aria-atomic="true">
          {String(activeIndex + 1).padStart(2, "0")}{" "}
          <span>/ {String(projects.length).padStart(2, "0")}</span>
        </span>
        <button onClick={() => change(-1)} aria-label="Önceki çalışma">
          <ArrowLeft size={20} />
        </button>
        <button onClick={() => change(1)} aria-label="Sonraki çalışma">
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

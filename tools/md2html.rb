#!/usr/bin/env ruby
# Minimal Markdown -> styled HTML for the Novaé FEATURES document.
# encoding: utf-8
src = File.read(ARGV[0], encoding: "utf-8")

def esc(s)
  s.gsub("&", "&amp;").gsub("<", "&lt;").gsub(">", "&gt;")
end

def inline(s)
  s = esc(s)
  s = s.gsub(/`([^`]+)`/) { "<code>#{$1}</code>" }
  s = s.gsub(/\*\*([^*]+)\*\*/) { "<strong>#{$1}</strong>" }
  s = s.gsub(/\*([^*]+)\*/) { "<em>#{$1}</em>" }
  s = s.gsub(/\[([^\]]+)\]\(([^)]+)\)/) { "<a href=\"#{$2}\">#{$1}</a>" }
  s
end

def cells(line)
  line.strip.sub(/^\|/, "").sub(/\|$/, "").split("|").map(&:strip)
end

out = []
lines = src.split("\n")
i = 0
in_list = false
in_pre = false

close_list = -> { if in_list; out << "</ul>"; in_list = false; end }

while i < lines.length
  line = lines[i]

  # fenced code
  if line.strip.start_with?("```")
    if in_pre
      out << "</code></pre>"; in_pre = false
    else
      close_list.call
      out << "<pre><code>"; in_pre = true
    end
    i += 1; next
  end
  if in_pre
    out << esc(line); i += 1; next
  end

  # table: current line has |, next line is separator
  if line.strip.start_with?("|") && lines[i + 1] && lines[i + 1].strip =~ /^\|[\s:\-|]+\|$/
    close_list.call
    header = cells(line)
    out << "<table><thead><tr>" + header.map { |c| "<th>#{inline(c)}</th>" }.join + "</tr></thead><tbody>"
    i += 2
    while i < lines.length && lines[i].strip.start_with?("|")
      row = cells(lines[i])
      out << "<tr>" + row.map { |c| "<td>#{inline(c)}</td>" }.join + "</tr>"
      i += 1
    end
    out << "</tbody></table>"
    next
  end

  # blockquote group (merge consecutive > lines)
  if line =~ /^>\s?(.*)/
    close_list.call
    buf = []
    while i < lines.length && lines[i] =~ /^>\s?(.*)/
      buf << $1
      i += 1
    end
    out << "<blockquote>#{inline(buf.join(' '))}</blockquote>"
    next
  end

  case line
  when /^### (.*)/
    close_list.call; out << "<h3>#{inline($1)}</h3>"
  when /^## (.*)/
    close_list.call; out << "<h2>#{inline($1)}</h2>"
  when /^# (.*)/
    close_list.call; out << "<h1>#{inline($1)}</h1>"
  when /^---\s*$/
    close_list.call; out << "<hr>"
  when /^>\s?(.*)/
    close_list.call; out << "<blockquote>#{inline($1)}</blockquote>"
  when /^(\s*)- (.*)/
    indent = $1.length
    unless in_list; out << "<ul>"; in_list = true; end
    cls = indent >= 3 ? ' class="sub"' : ""
    out << "<li#{cls}>#{inline($2)}</li>"
  when /^\s*$/
    close_list.call
  else
    close_list.call; out << "<p>#{inline(line)}</p>"
  end
  i += 1
end
close_list.call
out << "</code></pre>" if in_pre

css = <<~CSS
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #222a38;
         font-size: 12pt; line-height: 1.62; margin: 0; }
  h1 { font-size: 32pt; text-align: center; color: #20243a; margin: 30pt 0 6pt; letter-spacing: 0.5px; }
  h1::before { content: "\\2726"; display: block; color: #6a4cff; font-size: 36pt; margin-bottom: 12pt; }
  h1 + p { text-align: center; color: #5a6172; font-size: 12.5pt; }
  h2 { font-size: 19pt; color: #20243a; border-bottom: 2.5px solid #6a4cff; padding-bottom: 6pt;
       margin: 24pt 0 12pt; page-break-before: always; page-break-after: avoid; }
  h3 { font-size: 14pt; color: #2d4a86; margin: 18pt 0 5pt; page-break-after: avoid; }
  h3 + p, h3 + ul { page-break-before: avoid; }
  p { margin: 7pt 0; }
  table { border-collapse: collapse; width: 100%; margin: 11pt 0; font-size: 10.5pt; }
  thead { display: table-header-group; }   /* repeat header on each page */
  tr { page-break-inside: avoid; }
  th { background: #20283f; color: #fff; text-align: left; padding: 6pt 8pt; font-weight: 600; }
  td { border: 1px solid #d2d7e2; padding: 6pt 8pt; vertical-align: top; }
  tbody tr:nth-child(even) { background: #f4f6fb; }
  blockquote { background: #f1ecff; border-left: 4px solid #6a4cff; padding: 9pt 14pt;
               color: #3a3a55; margin: 12pt 0; font-style: italic; border-radius: 0 7px 7px 0;
               page-break-inside: avoid; }
  code { background: #eef1f7; padding: 1pt 4pt; border-radius: 3px;
         font-family: ui-monospace, Menlo, monospace; font-size: 10pt; }
  pre { background: #0d1326; color: #dce4ff; padding: 12pt 14pt; border-radius: 8px;
        font-size: 9.5pt; line-height: 1.5; page-break-inside: avoid; }
  pre code { background: none; color: inherit; padding: 0; font-size: 9.5pt; }
  ul { margin: 7pt 0; padding-left: 22pt; }
  li { margin: 4pt 0; page-break-inside: avoid; }
  li.sub { list-style: circle; margin-left: 16pt; }
  hr { border: none; border-top: 1px solid #e2e6ee; margin: 18pt 0; }
  a { color: #2d4a86; text-decoration: none; }
  strong { color: #20243a; }
CSS

html = "<!DOCTYPE html>\n<html lang=\"fr\"><head><meta charset=\"utf-8\">" \
       "<title>Novaé — Fonctionnalités</title><style>#{css}</style></head>" \
       "<body>#{out.join("\n")}</body></html>"

print html

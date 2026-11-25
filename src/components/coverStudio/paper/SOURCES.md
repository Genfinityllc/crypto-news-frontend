# Paper photographs

Two photographs of real crumpled paper, chosen by the owner on 2026-11-24 from
a sheet of ten (the owner turned down drawn paper: "We would need actual paper
textures not try to make them"). Both may be bundled and passed on.

| File here | Source | Licence, as read on the page on 2026-11-24 |
|---|---|---|
| `paper-folds.jpg` | "Crumpled White Paper Texture", https://www.photos-public-domain.com/2012/01/31/crumpled-white-paper-texture/ (original 3888 x 2592, sha256 2a13925ef253b4027cb7...) | Public domain. Page header: "Free Photos for any use including Commercial". Page footer: "All Photos on this site have been released into the Public Domain". |
| `paper-crumple.jpg` | PxHere photo 1442969 by icon0com, https://pxhere.com/en/photo/1442969 (original 3200 x 2134, sha256 5c2b496160312d899d01...) | CC0. Photo page: "The image is released free of copyrights under Creative Commons CC0. You may download, modify, distribute, and use them royalty free for anything you like, even in commercial applications. Attribution is not required." |

What was done to them: made grey, 2048 px wide, and the uneven lighting taken
out (each pixel divided by the broad brightness around it), so flat paper sits
at level 173 of 255, folds are darker and catches of light brighter. The first
is a gentle photograph, so its contrast about that level was raised 3.6 times
(after a slight blur, so camera noise is not raised with it); the second is
harsh and was raised only 1.15 times. The script that did it is kept beside
this note as `prepare-paper.js.txt` (it needs `sharp`; not part of the build). The
`-small` files are the same at 480 px, for the tiles. See `../paper.js`.

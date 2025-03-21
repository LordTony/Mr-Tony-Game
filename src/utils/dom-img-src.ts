import { ImageSource, Sprite, Vector } from "excalibur";

export async function Create_Sprite_From_HtmlElement_Async(html: HTMLElement, wontBeBiggerThan?: Vector): Promise<Sprite> {
    return new Promise((resolve, _reject) => {
        var canvas = document.createElement('canvas') as HTMLCanvasElement;
        canvas.width = wontBeBiggerThan?.x ?? 800
        canvas.height = wontBeBiggerThan?.y ?? 800

        var data = `
            <svg xmlns="http://www.w3.org/2000/svg" height="${canvas.height}px" width="${canvas.width}px">
                <foreignObject height="${canvas.height}px" width="${canvas.width}px">
                    <div xmlns="http://www.w3.org/1999/xhtml">
                        ${html.outerHTML}
                    </div>
                </foreignObject>
            </svg>
        `.trim();

        console.log(canvas.height, canvas.width)

        var DOMURL = window.URL || window.webkitURL || window;

        var img = new Image();
        var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
        var url = DOMURL.createObjectURL(svg);

        img.onload = () => {
            var ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
            console.log("img", img.height, img.width)
            ctx.drawImage(img, 0, 0);

            DOMURL.revokeObjectURL(url);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
            let minX = canvas.width;
            let minY = canvas.height
            let maxX = 0
            let maxY = 0;
          
            for (let y = 0; y < canvas.height; y++) {
              for (let x = 0; x < canvas.width; x++) {
                const index = (y * canvas.width + x) * 4;
                const alpha = imageData.data[index + 3];
                if (alpha > 0) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }

            // crop the canvas size and redraw the image
            canvas.width = maxX - minX + 1;
            canvas.height = maxY - minY + 1;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, -minX, -minY);

            const data = canvas.toDataURL();
            const dataImage = new ImageSource(data)
            dataImage.load().then(() => {
                const graphic = dataImage.toSprite();
                resolve(graphic);
            })
        }

        img.src = url;
    })
}
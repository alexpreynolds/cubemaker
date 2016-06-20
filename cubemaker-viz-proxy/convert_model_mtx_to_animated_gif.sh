#!/bin/bash

usage() { echo "Usage: $0 [-i <input_fn>] [-o <output_fn>] [-t <theta>] [-p <phi>] [-r <radius>] [-y <invert_y_axis>]" 1>&2; exit 1; }

while getopts ":i:o:t:p:r:y:" opt; do
    case "${opt}" in
        i)
            input=${OPTARG}
            ;;
        o)
            output=${OPTARG}
            ;;
        t)
            theta=${OPTARG}
            ;;
        p)
            phi=${OPTARG}
            ;;
        r)
            radius=${OPTARG}
            ;;
        y)
            invertYAxis=${OPTARG}
            ;;
        *)
            usage
            ;;
    esac
done
shift $((OPTIND-1))

if [ -z "${input}" ] || [ -z "${output}" ] || [ -z "${theta}" ] || [ -z "${phi}" ] || [ -z "${radius}" ] || [ -z "${invertYAxis}" ]; then
    usage
fi

pdf=${output%.*}.pdf
id_prev=${pdf##*/}
id=${id_prev%.*}
#echo ${id}
workdir=/tmp/${id}
#echo ${workdir}
mkdir -p ${workdir}

# make PNG frames in work directory
./convert_model_mtx_to_animated_gif.Rscript --input ${input} --output ${workdir} --theta ${theta} --phi ${phi} --radius ${radius} --invertYAxis ${invertYAxis}

# convert PNG frames to GIF frames
for i in `ls ${workdir}/*.png`; do convert $i $i.gif; done

# stitch GIF frames into ${output} file
gifsicle --delay 10 --loopcount --colors 256 ${workdir}/*.gif > ${output}

# cleanup
rm -r ${workdir}
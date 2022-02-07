package aria

import (
	"os/exec"
	"strings"
)

func CheckPid() (pid string) {
	cmd := exec.Command("ps", "-ef")
	if output, err := cmd.Output(); err != nil {
		panic(err)
	} else {
		pid = string(output)
		lines := strings.Split(pid, "\n")
		for _, line := range lines {
			index := strings.Index(line, "aria2c")
			if index != -1 {
				pid = line
			}
		}
	}
	return
}

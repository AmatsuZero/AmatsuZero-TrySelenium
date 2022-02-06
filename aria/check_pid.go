package aria

import "os/exec"

func CheckPid() (pid string) {
	cmd := exec.Command("ps", "-ef")
	if output, err := cmd.Output(); err != nil {
		panic(err)
	} else {
		pid = string(output)
	}
	return
}
